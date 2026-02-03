import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const totalCustomers = await prisma.customer.count({
            where: {
                receivables: { some: { status: 'OPEN', outstanding: { gt: 0 } } }
            }
        });

        const receivables = await prisma.receivable.aggregate({
            _sum: {
                outstanding: true
            },
            where: {
                status: 'OPEN',
                outstanding: { gt: 0 }
            }
        });

        const totalOutstanding = receivables._sum.outstanding || 0;

        // Detailed List for Table
        const customers = await prisma.customer.findMany({
            where: {
                receivables: { some: { status: 'OPEN', outstanding: { gt: 0 } } }
            },
            include: {
                receivables: {
                    where: { status: 'OPEN', outstanding: { gt: 0 } }
                }
            }
        });

        const customerStats = customers.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            totalOwing: c.receivables.reduce((acc, r) => acc + r.outstanding, 0),
            invoiceCount: c.receivables.length
        }));

        return NextResponse.json({
            stats: {
                totalCustomers,
                totalOutstanding
            },
            customers: customerStats
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
