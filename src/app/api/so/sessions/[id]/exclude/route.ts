import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get unique customer names and current excluded list
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await prisma.soSession.findUnique({
            where: { id },
            select: { excludedCustomers: true }
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get unique customer names with counts
        const customers = await prisma.soItem.groupBy({
            by: ['customerName'],
            where: { sessionId: id },
            _count: { id: true },
            _sum: { amount: true, primeOwing: true },
            orderBy: { customerName: 'asc' }
        });

        const excludedList: string[] = JSON.parse(session.excludedCustomers || '[]');

        return NextResponse.json({
            excludedCustomers: excludedList,
            customers: customers.map(c => ({
                name: c.customerName,
                invoiceCount: c._count.id,
                totalAmount: c._sum.amount || 0,
                totalOwing: c._sum.primeOwing || 0,
                isExcluded: excludedList.includes(c.customerName)
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Update excluded customers list and mark/unmark items
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { excludedCustomers } = body as { excludedCustomers: string[] };

        if (!Array.isArray(excludedCustomers)) {
            return NextResponse.json({ error: 'excludedCustomers must be an array' }, { status: 400 });
        }

        // Get previous excluded list
        const session = await prisma.soSession.findUnique({
            where: { id },
            select: { excludedCustomers: true }
        });
        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        const previousExcluded: string[] = JSON.parse(session.excludedCustomers || '[]');

        // Find newly added and newly removed customers
        const newlyExcluded = excludedCustomers.filter(c => !previousExcluded.includes(c));
        const newlyIncluded = previousExcluded.filter(c => !excludedCustomers.includes(c));

        await prisma.$transaction(async (tx) => {
            // 1. Save the new excluded list
            await tx.soSession.update({
                where: { id },
                data: { excludedCustomers: JSON.stringify(excludedCustomers) }
            });

            // 2. Mark newly excluded items
            if (newlyExcluded.length > 0) {
                await tx.soItem.updateMany({
                    where: {
                        sessionId: id,
                        customerName: { in: newlyExcluded }
                    },
                    data: {
                        existenceStatus: 'Exclude',
                        status: 'MATCHED',
                        remarks: 'Excluded dari SO'
                    }
                });
            }

            // 3. Reset newly un-excluded items back to unverified
            if (newlyIncluded.length > 0) {
                await tx.soItem.updateMany({
                    where: {
                        sessionId: id,
                        customerName: { in: newlyIncluded },
                        existenceStatus: 'Exclude'
                    },
                    data: {
                        existenceStatus: null,
                        status: 'UNVERIFIED',
                        remarks: null
                    }
                });
            }
        });

        // Return updated counts
        const excludedCount = await prisma.soItem.count({
            where: { sessionId: id, existenceStatus: 'Exclude' }
        });

        return NextResponse.json({
            success: true,
            excludedCustomers,
            excludedItemCount: excludedCount
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
