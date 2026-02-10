import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccurateServerService } from '@/services/accurateServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, filters, page, pagesPerBatch = 1 } = body;

        const PAGE_SIZE = 200; // Increased from 100 for faster fetching

        if (!sessionId || !page) {
            return NextResponse.json({ error: 'Session ID and Page are required' }, { status: 400 });
        }

        // Build list of pages to fetch
        const pagesToFetch = Array.from({ length: pagesPerBatch }, (_, i) => page + i);

        console.log(`[BATCH] Fetching pages [${pagesToFetch.join(', ')}] in parallel (pageSize=${PAGE_SIZE})...`);

        // Fetch all pages in parallel
        const results = await Promise.all(
            pagesToFetch.map(p => AccurateServerService.fetchInvoices({
                ...filters,
                page: p,
                limit: PAGE_SIZE
            }))
        );

        // Combine results and check for errors / end of data
        let allInvoices: any[] = [];
        let hasMore = true;

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const pageNum = pagesToFetch[i];

            if (result.error) {
                console.warn(`[BATCH] Page ${pageNum} error: ${result.error}`);
                hasMore = false;
                break;
            }

            allInvoices.push(...result.invoices);
            const rawCount = result.rawCount || 0;

            console.log(`[BATCH]   Page ${pageNum}: ${rawCount} raw → ${result.invoices.length} filtered`);

            // If this page returned less than PAGE_SIZE raw items, no more data
            if (rawCount < PAGE_SIZE) {
                hasMore = false;
                break;
            }
        }

        const totalValue = allInvoices.reduce((sum: number, item: any) => sum + item.primeOwing, 0);

        // Save to Database
        await prisma.$transaction(async (tx) => {
            if (allInvoices.length > 0) {
                const itemsData = allInvoices.map(inv => ({
                    sessionId,
                    transNo: inv.transNo,
                    transDate: inv.transDate,
                    dueDate: inv.dueDate,
                    customerName: inv.customerName,
                    description: inv.description,
                    statusName: inv.statusName,
                    approvalStatus: inv.approvalStatus,
                    amount: inv.amount,
                    outstanding: inv.outstanding,
                    primeOwing: inv.primeOwing,
                    status: 'UNVERIFIED'
                }));

                await tx.soItem.createMany({
                    data: itemsData
                });

                await tx.soSession.update({
                    where: { id: sessionId },
                    data: {
                        totalItems: { increment: allInvoices.length },
                        totalValue: { increment: totalValue }
                    }
                });
            }
        });

        console.log(`[BATCH] Saved ${allInvoices.length} invoices. hasMore=${hasMore}`);

        return NextResponse.json({
            success: true,
            count: allInvoices.length,
            hasMore
        });

    } catch (error: any) {
        console.error("Batch Import Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
