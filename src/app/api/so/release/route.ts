import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccurateServerService } from '@/services/accurateServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { filters, periodName } = body;

        if (!periodName) {
            return NextResponse.json({ error: 'Period Name is required' }, { status: 400 });
        }

        // 1. Fetch ALL data from Accurate (Parallel Batch)
        const result = await AccurateServerService.fetchAllInvoices(filters);

        if (result.error) {
            return NextResponse.json({ error: `Accurate API Error: ${result.error}` }, { status: 500 });
        }

        const allInvoices = result.invoices;

        if (allInvoices.length === 0) {
            return NextResponse.json({ error: 'No data found from Accurate with provided filters' }, { status: 404 });
        }

        // 2. Save to Database
        const totalValue = allInvoices.reduce((sum, item) => sum + item.primeOwing, 0);

        const session = await prisma.soSession.create({
            data: {
                periodName,
                status: 'OPEN',
                totalItems: allInvoices.length,
                totalValue: totalValue,
                items: {
                    create: allInvoices.map(inv => ({
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
                        // Defaults
                        status: 'UNVERIFIED'
                    }))
                }
            }
        });

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            count: allInvoices.length
        });

    } catch (error: any) {
        console.error("Release SO Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
