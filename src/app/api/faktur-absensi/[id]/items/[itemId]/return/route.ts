import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH - Mark item as returned
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { id, itemId } = await params;

    try {
        const item = await prisma.fakturAbsensiItem.findFirst({
            where: { id: itemId, absensiId: id }
        });

        if (!item) {
            return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
        }

        // Toggle: if already returned, set back to OUT
        const isReturning = item.returnStatus === 'OUT';

        const updated = await prisma.fakturAbsensiItem.update({
            where: { id: itemId },
            data: {
                returnStatus: isReturning ? 'RETURNED' : 'OUT',
                returnedAt: isReturning ? new Date() : null,
            }
        });

        return NextResponse.json({ item: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
