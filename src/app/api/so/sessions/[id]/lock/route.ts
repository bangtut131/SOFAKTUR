import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {


        const session = await prisma.soSession.update({
            where: { id },
            data: {
                status: 'LOCKED'
            }
        });

        return NextResponse.json({ success: true, session });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
