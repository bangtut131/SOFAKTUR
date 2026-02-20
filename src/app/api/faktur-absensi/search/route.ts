import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Search SO items by transNo for autocomplete
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';

        if (q.length < 2) {
            return NextResponse.json({ items: [] });
        }

        // Search across all sessions for matching transNo
        const items = await prisma.soItem.findMany({
            where: {
                transNo: {
                    contains: q,
                    mode: 'insensitive',
                }
            },
            select: {
                transNo: true,
                customerName: true,
                amount: true,
            },
            distinct: ['transNo'],
            take: 10,
            orderBy: { transNo: 'asc' }
        });

        return NextResponse.json({ items });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
