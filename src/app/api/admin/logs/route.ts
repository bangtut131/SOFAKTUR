import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const logs = await prisma.broadcastLog.findMany({
            orderBy: { sentAt: 'desc' },
            take: limit
        });

        return NextResponse.json({ success: true, logs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
