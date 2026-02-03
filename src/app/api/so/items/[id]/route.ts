import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const { existenceStatus, remarks, status } = await request.json();
        const id = params.id;

        const updatedItem = await prisma.soItem.update({
            where: { id },
            data: {
                existenceStatus,
                remarks,
                status
            }
        });

        return NextResponse.json({ success: true, item: updatedItem });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
