import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { periodName } = body;

        if (!periodName) {
            return NextResponse.json({ error: 'Period Name is required' }, { status: 400 });
        }

        const session = await prisma.soSession.create({
            data: {
                periodName,
                status: 'OPEN',
                totalItems: 0,
                totalValue: 0
            }
        });

        return NextResponse.json({ success: true, sessionId: session.id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
