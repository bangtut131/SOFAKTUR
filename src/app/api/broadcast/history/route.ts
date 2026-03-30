import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const status = searchParams.get('status');

        const where: any = {};
        if (status) where.status = status;

        const logs = await prisma.broadcastLog.findMany({
            where,
            orderBy: { sentAt: 'desc' },
            take: limit,
        });

        // Summary stats
        const stats = await prisma.broadcastLog.groupBy({
            by: ['status'],
            _count: true,
        });

        const lastBroadcast = await prisma.broadcastLog.findFirst({
            where: { status: 'SENT' },
            orderBy: { sentAt: 'desc' },
            select: { sentAt: true },
        });

        return NextResponse.json({
            success: true,
            logs,
            stats: stats.reduce((acc: any, s) => { acc[s.status] = s._count; return acc; }, {}),
            lastBroadcast: lastBroadcast?.sentAt || null,
        });
    } catch (error: any) {
        console.error('History error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
