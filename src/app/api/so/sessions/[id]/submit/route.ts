import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        const session = await prisma.soSession.update({
            where: { id },
            data: {
                status: 'WAITING_APPROVAL'
            }
        });

        return NextResponse.json({ success: true, session });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
