import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const branchId = searchParams.get('branchId');

        const whereClause: any = {
            status: 'OPEN',
            outstanding: { gt: 0 },
        };
        if (branchId) whereClause.branchId = branchId;

        const customers = await prisma.customer.findMany({
            where: {
                receivables: { some: whereClause },
            },
            include: {
                receivables: {
                    where: whereClause,
                    orderBy: { transDate: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });

        const result = customers.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            invoiceCount: c.receivables.length,
            totalOwing: c.receivables.reduce((sum, r) => sum + r.outstanding, 0),
            invoices: c.receivables.map(r => ({
                transNo: r.transNo,
                transDate: r.transDate,
                dueDate: r.dueDate,
                amount: r.amount,
                outstanding: r.outstanding,
            })),
        }));

        return NextResponse.json({ success: true, recipients: result });
    } catch (error: any) {
        console.error('Recipients error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
