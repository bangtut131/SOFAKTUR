import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
        return NextResponse.json({ error: 'customerId required' }, { status: 400 });
    }

    try {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                receivables: {
                    where: { status: 'OPEN', outstanding: { gt: 0 } },
                    orderBy: { dueDate: 'asc' }
                }
            }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json({
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email
            },
            receivables: customer.receivables.map(r => ({
                id: r.id,
                transNo: r.transNo,
                transDate: r.transDate,
                dueDate: r.dueDate,
                amount: r.amount,
                outstanding: r.outstanding,
                status: r.status
            })),
            totalOwing: customer.receivables.reduce((sum, r) => sum + r.outstanding, 0)
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
