import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, fromDate, toDate } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Build where clause
        const where: any = { sessionId };

        // Date range filter on transDate (format: dd/MM/yyyy)
        // We'll filter in JS since transDate is stored as string
        let items = await prisma.soItem.findMany({
            where,
            select: {
                id: true,
                transNo: true,
                transDate: true,
                customerName: true
            },
            orderBy: { transNo: 'asc' }
        });

        // JS-level date filter if provided
        if (fromDate || toDate) {
            const toIntDate = (dString: string) => {
                if (!dString) return 0;
                // dd/MM/yyyy → YYYYMMDD
                const parts = dString.split('/');
                if (parts.length === 3) {
                    return parseInt(`${parts[2]}${parts[1]}${parts[0]}`);
                }
                return 0;
            };

            const toIntInput = (isoString: string) => {
                if (!isoString) return 0;
                // yyyy-mm-dd → YYYYMMDD
                const [y, m, d] = isoString.split('-');
                return parseInt(`${y}${m}${d}`);
            };

            const start = fromDate ? toIntInput(fromDate) : 0;
            const end = toDate ? toIntInput(toDate) : 99999999;

            items = items.filter(item => {
                const itemDate = toIntDate(item.transDate);
                return itemDate >= start && itemDate <= end;
            });
        }

        return NextResponse.json({
            success: true,
            items,
            count: items.length
        });
    } catch (error: any) {
        console.error("Cetak QR API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
