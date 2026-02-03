import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccurateServerService } from '@/services/accurateServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, filters, page } = body;

        const LIMIT = '100';

        if (!sessionId || !page) {
            return NextResponse.json({ error: 'Session ID and Page are required' }, { status: 400 });
        }

        // 1. Fetch from Accurate
        const result = await AccurateServerService.fetchInvoices({
            ...filters,
            page: page.toString(),
            limit: LIMIT
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        const invoices = result.invoices;
        const totalValue = invoices.reduce((sum, item) => sum + item.primeOwing, 0);

        // 2. Save to Database (Transaction to update Session Stats too)
        await prisma.$transaction(async (tx) => {
            // Bulk Insert Items
            if (invoices.length > 0) {
                // Prepare data
                const itemsData = invoices.map(inv => ({
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

                // Use createMany for performance (SQLite supports this in recent Prisma versions, else loop)
                // Note: SQLite connector in Prisma DOES support createMany.
                await tx.soItem.createMany({
                    data: itemsData
                });

                // Update Session Stats
                await tx.soSession.update({
                    where: { id: sessionId },
                    data: {
                        totalItems: { increment: invoices.length },
                        totalValue: { increment: totalValue }
                    }
                });
            }
        });

        // Determine if there are more
        const hasMore = (result.rawCount || 0) >= parseInt(LIMIT);

        return NextResponse.json({
            success: true,
            count: invoices.length,
            hasMore
        });

    } catch (error: any) {
        console.error("Batch Import Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
