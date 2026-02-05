import { NextResponse } from 'next/server';
import { AccurateServerService } from '@/services/accurateServer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { branchId } = body || {};

        console.log(`[PIUTANG SYNC] Starting sync with branchId: ${branchId || 'ALL'}`);

        // 1. Fetch ALL unpaid invoices from Accurate
        let allInvoices: any[] = [];
        let page = 1;
        let hasMore = true;
        const LIMIT = 100;
        const MAX_PAGES = 500;

        // Optimized: Fetch pages in parallel to speed up Phase 1 (Accurate API is slow)
        const CONCURRENT_REQUESTS = 5; // Safe limit to avoid 429 too quickly

        while (hasMore && page <= MAX_PAGES) {
            const pageBatch = [];
            for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
                if (page + i <= MAX_PAGES) {
                    pageBatch.push(page + i);
                }
            }

            if (pageBatch.length === 0) break;

            console.log(`[PIUTANG SYNC] Fetching pages ${pageBatch.join(', ')} in parallel...`);

            const results = await Promise.all(pageBatch.map(p =>
                AccurateServerService.fetchInvoices({
                    owingStatus: 'UNPAID',
                    page: p,
                    limit: LIMIT,
                    branchId: branchId || undefined
                })
            ));

            let batchHasMore = true;
            for (const result of results) {
                if (result.error) {
                    console.error(`[PIUTANG SYNC] Error in batch: ${result.error}`);
                    // If error, we might stop or continue. Let's continue partials.
                } else {
                    if (result.invoices && result.invoices.length > 0) {
                        allInvoices.push(...result.invoices);
                    }

                    const rawCount = result.rawCount || (result.invoices ? result.invoices.length : 0);
                    if (rawCount < LIMIT) {
                        batchHasMore = false; // Found a non-full page, so end reached
                    }
                }
            }

            if (!batchHasMore) hasMore = false;
            page += pageBatch.length;

            // Small delay between batches to allow API buffer
            await new Promise(r => setTimeout(r, 500));
        }

        console.log(`[PIUTANG SYNC] Total invoices fetched: ${allInvoices.length}`);

        // 2. Process Data & Persist to DB
        // Clear existing Open Receivables first (optional: strategy could be soft delete or update status)
        // For simplicity, we will mark all currently OPEN receivables as PAID first, then upsert the ones we found.
        // Actually, safer strategy: Get all known OPEN invoices from DB. If not in new list, mark PAID.
        // Then Upsert new list.

        // Let's go simpler: Delete all OPEN receivables for this branch/scope and re-insert. 
        // But we want to preserve history? Requires more complex logic.
        // Re-inserting is "Replace" strategy.

        // Strategy:
        // A. Upsert Customers
        // B. Upsert Receivables

        const uniqueCustomers = new Map<string, string>(); // accurateId -> name

        // Prepare data for bulk operations or transactional loop
        const now = new Date();

        for (const inv of allInvoices) {
            const custId = inv.customerAccurateId || inv.customerName; // Fallback if ID invalid
            if (!uniqueCustomers.has(custId)) {
                uniqueCustomers.set(custId, inv.customerName);
            }
        }

        // Batch Upsert Customers
        console.log(`[PIUTANG SYNC] Upserting ${uniqueCustomers.size} customers...`);

        const customerEntries = Array.from(uniqueCustomers.entries());
        const CUSTOMER_BATCH_SIZE = 20; // 20 concurrent connections

        for (let i = 0; i < customerEntries.length; i += CUSTOMER_BATCH_SIZE) {
            const batch = customerEntries.slice(i, i + CUSTOMER_BATCH_SIZE);
            await Promise.all(batch.map(async ([custId, name]) => {
                const existing = await prisma.customer.findUnique({ where: { accurateId: custId } });
                if (!existing) {
                    await prisma.customer.create({
                        data: { accurateId: custId, name: name }
                    });
                } else {
                    await prisma.customer.update({
                        where: { id: existing.id },
                        data: { name: name }
                    });
                }
            }));
        }

        // Sync Phone Numbers for Customers missing phone (limit to avoid timeout)
        // Fetch 5 missing phones per sync to be safe/fast
        const customersMissingPhone = await prisma.customer.findMany({
            where: { phone: null },
            take: 10
        });

        if (customersMissingPhone.length > 0) {
            console.log(`[PIUTANG SYNC] Fetching phone numbers for ${customersMissingPhone.length} customers...`);
            for (const cust of customersMissingPhone) {
                const detail = await AccurateServerService.getCustomerDetail(cust.accurateId);
                if (detail && (detail.phone || detail.mobilePhone)) {
                    const phone = detail.mobilePhone || detail.phone;
                    await prisma.customer.update({
                        where: { id: cust.id },
                        data: { phone: phone }
                    });
                }
                await new Promise(r => setTimeout(r, 500)); // rate limit
            }
        }

        // Sync Receivables
        // 1. Get all customer IDs again to map accurateId -> dbId
        const dbCustomers = await prisma.customer.findMany({
            where: { accurateId: { in: Array.from(uniqueCustomers.keys()) } }
        });
        const custMap = new Map(dbCustomers.map(c => [c.accurateId, c.id]));

        // 2. Mark all currently OPEN receivables as CHECKING (temp status) or just process upserts
        // We will just upsert. If an invoice is no longer in the list but was OPEN, it should be marked PAID.
        // Get list of all invoice numbers from current fetch
        const currentInvoiceNos = allInvoices.map(i => i.transNo);

        // Update DB: Mark invoices NOT in currentInvoiceNos as PAID (if they are currently OPEN)
        // Update DB: Mark invoices NOT in currentInvoiceNos as PAID (if they are currently OPEN)
        // CRITICAL FIX: Only for the current branch if specified!
        const deleteWhere: any = {
            status: 'OPEN',
            transNo: { notIn: currentInvoiceNos }
        };
        if (branchId) {
            deleteWhere.branchId = branchId;
        }

        await prisma.receivable.updateMany({
            where: deleteWhere,
            data: { status: 'PAID', lastSyncedAt: now }
        });

        // 3. Upsert current invoices
        console.log(`[PIUTANG SYNC] Upserting ${allInvoices.length} invoices...`);

        // Use transaction or sequential to avoid locking if SQLite
        // Optimized: Batch processing for Postgres (Railway)
        const INVOICE_BATCH_SIZE = 50;
        for (let i = 0; i < allInvoices.length; i += INVOICE_BATCH_SIZE) {
            const batch = allInvoices.slice(i, i + INVOICE_BATCH_SIZE);
            await Promise.all(batch.map(async (inv) => {
                const customerDbId = custMap.get(inv.customerAccurateId || inv.customerName);
                if (!customerDbId) return; // continue -> return in map

                const amount = inv.amount || 0;
                const outstanding = inv.outstanding || inv.primeOwing || 0;
                const transDate = new Date(convertDate(inv.transDate));
                const dueDate = new Date(convertDate(inv.dueDate));

                // Use upsert directly to be atomic and faster
                await prisma.receivable.upsert({
                    where: { transNo: inv.transNo },
                    update: {
                        outstanding: outstanding,
                        status: 'OPEN',
                        lastSyncedAt: now,
                        branchId: inv.branchId || null // Added branchId
                    },
                    create: {
                        customerId: customerDbId,
                        transNo: inv.transNo,
                        transDate: transDate,
                        dueDate: dueDate,
                        amount: amount,
                        outstanding: outstanding,
                        status: 'OPEN',
                        lastSyncedAt: now,
                        branchId: inv.branchId || null // Added branchId
                    }
                });
            }));
        }

        // Return latest stats
        const finalStats = await getPiutangStats(branchId);

        return NextResponse.json({
            success: true,
            stats: finalStats.stats,
            customers: finalStats.customers
        });

    } catch (error: any) {
        console.error("Sync Piutang Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper to convert DD/MM/YYYY to Date object
function convertDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date();
}

// Shared helper (move to service later if needed)
async function getPiutangStats(branchId?: string) {
    const where: any = { status: 'OPEN', outstanding: { gt: 100 } };
    if (branchId) where.branchId = branchId;

    const rawReceivables = await prisma.receivable.findMany({
        where: where, // Ignore dust & filter branch
        include: { customer: true },
        orderBy: { outstanding: 'desc' }
    });

    const totalOutstanding = rawReceivables.reduce((sum, r) => sum + r.outstanding, 0);
    const uniqueCustIds = new Set(rawReceivables.map(r => r.customerId));

    // Group by customer for response
    const custMap = new Map<string, any>();

    for (const r of rawReceivables) {
        if (!custMap.has(r.customerId)) {
            custMap.set(r.customerId, {
                id: r.customer.id, // Internal ID
                accurateId: r.customer.accurateId,
                name: r.customer.name,
                phone: r.customer.phone,
                invoiceCount: 0,
                totalOwing: 0,
                invoices: []
            });
        }

        const c = custMap.get(r.customerId);
        // c.invoiceCount++ removed, will set from length later
        c.totalOwing += r.outstanding;
        c.invoices.push({
            transNo: r.transNo,
            transDate: r.transDate.toLocaleDateString('id-ID'),
            dueDate: r.dueDate.toLocaleDateString('id-ID'),
            amount: r.amount,
            outstanding: r.outstanding
        });
    }

    // Set invoiceCount explicitly
    for (const c of custMap.values()) {
        c.invoiceCount = c.invoices.length;
    }

    const customers = Array.from(custMap.values()).sort((a, b) => b.totalOwing - a.totalOwing);

    return {
        stats: {
            totalCustomers: uniqueCustIds.size,
            totalInvoices: rawReceivables.length,
            totalOutstanding
        },
        customers
    };
}
