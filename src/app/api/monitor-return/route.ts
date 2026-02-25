import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccurateServerService } from '@/services/accurateServer';

// GET: Return saved data from DB
export async function GET() {
    try {
        const data = await prisma.monitorReturn.findMany({
            orderBy: { syncedAt: 'desc' }
        });

        // Get last sync time
        const lastSync = data.length > 0 ? data[0].syncedAt : null;

        return NextResponse.json({
            success: true,
            invoices: data,
            count: data.length,
            lastSyncedAt: lastSync
        });
    } catch (error: any) {
        console.error("Monitor Return GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Sync from Accurate, save to DB, return fresh data
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { filters } = body;

        // Force filter to RETURN (primeOwing < 0)
        const forcedFilters = {
            ...filters,
            owingStatus: 'RETURN'
        };

        // Fetch ALL data from Accurate (Looping Pages)
        let allInvoices: any[] = [];
        let page = 1;
        let hasMore = true;
        const LIMIT = '100';
        const MAX_PAGES = 50;

        while (hasMore && page <= MAX_PAGES) {
            const result = await AccurateServerService.fetchInvoices({
                ...forcedFilters,
                page: page.toString(),
                limit: LIMIT
            });

            if (result.error) {
                return NextResponse.json({ error: `Accurate API Error on page ${page}: ${result.error}` }, { status: 500 });
            }

            const pageData = result.invoices;
            allInvoices = [...allInvoices, ...pageData];

            if ((result.rawCount || 0) < parseInt(LIMIT)) {
                hasMore = false;
            } else {
                page++;
            }
        }

        // Save to DB: Delete old data, insert new
        const syncTime = new Date();

        await prisma.$transaction(async (tx) => {
            // Clear existing data
            await tx.monitorReturn.deleteMany({});

            // Insert new data
            if (allInvoices.length > 0) {
                await tx.monitorReturn.createMany({
                    data: allInvoices.map(inv => ({
                        transNo: inv.transNo || '',
                        transDate: inv.transDate || '',
                        customerName: inv.customerName || '',
                        branchName: inv.branchName || null,
                        description: inv.description || null,
                        amount: inv.amount || 0,
                        primeOwing: inv.primeOwing || 0,
                        statusName: inv.statusName || null,
                        syncedAt: syncTime
                    }))
                });
            }
        });

        return NextResponse.json({
            success: true,
            invoices: allInvoices,
            count: allInvoices.length,
            lastSyncedAt: syncTime
        });
    } catch (error: any) {
        console.error("Monitor Return POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
