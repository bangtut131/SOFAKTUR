import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccurateServerService } from '@/services/accurateServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, filters } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // 1. Fetch ALL data from Accurate (Parallel Batch)
        const result = await AccurateServerService.fetchAllInvoices(filters);

        if (result.error) {
            return NextResponse.json({ error: `Accurate API Error: ${result.error}` }, { status: 500 });
        }

        const invoices = result.invoices;

        if (invoices.length === 0) {
            return NextResponse.json({ error: 'No data found from Accurate with provided filters' }, { status: 404 });
        }

        // 2. Save to Database in chunks (to avoid SQLite limits)
        const CHUNK_SIZE = 500;
        let totalSaved = 0;

        for (let i = 0; i < invoices.length; i += CHUNK_SIZE) {
            const chunk = invoices.slice(i, i + CHUNK_SIZE);
            const chunkValue = chunk.reduce((sum, item) => sum + item.primeOwing, 0);

            await prisma.$transaction(async (tx) => {
                await tx.soItem.createMany({
                    data: chunk.map(inv => ({
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
                    }))
                });

                await tx.soSession.update({
                    where: { id: sessionId },
                    data: {
                        totalItems: { increment: chunk.length },
                        totalValue: { increment: chunkValue }
                    }
                });
            });

            totalSaved += chunk.length;
        }

        return NextResponse.json({
            success: true,
            count: totalSaved,
            totalFromApi: result.totalCount
        });

    } catch (error: any) {
        console.error("Release All Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
