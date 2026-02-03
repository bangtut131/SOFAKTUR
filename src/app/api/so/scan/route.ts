import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { sessionId, barcode } = await request.json();

        if (!sessionId || !barcode) {
            return NextResponse.json({ error: 'Missing sessionId or barcode' }, { status: 400 });
        }

        // Find the item in this session
        const item = await prisma.soItem.findFirst({
            where: {
                sessionId: sessionId,
                transNo: barcode
            }
        });

        if (!item) {
            return NextResponse.json({ error: 'Invoice not found in this session', found: false }, { status: 404 });
        }

        if (item.status === 'MATCHED') {
            return NextResponse.json({ message: 'Already scanned', item, found: true });
        }

        // Update Status
        const updatedItem = await prisma.soItem.update({
            where: { id: item.id },
            data: {
                status: 'MATCHED',
                scannedAt: new Date(),
                existenceStatus: 'Ada' // Default when scanned
            }
        });

        return NextResponse.json({ success: true, item: updatedItem, found: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
