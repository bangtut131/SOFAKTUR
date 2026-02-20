import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List all absensi sessions
export async function GET() {
    try {
        const sessions = await prisma.fakturAbsensi.findMany({
            orderBy: { date: 'desc' },
            include: {
                items: true,
                _count: { select: { items: true } }
            }
        });

        // Add computed stats
        const sessionsWithStats = sessions.map(s => ({
            ...s,
            totalItems: s.items.length,
            outCount: s.items.filter(i => i.returnStatus === 'OUT').length,
            returnedCount: s.items.filter(i => i.returnStatus === 'RETURNED').length,
        }));

        return NextResponse.json({ sessions: sessionsWithStats });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new absensi session
export async function POST(request: Request) {
    try {
        const { date, salesName, notes } = await request.json();

        if (!date || !salesName) {
            return NextResponse.json(
                { error: 'Tanggal dan Nama Sales wajib diisi' },
                { status: 400 }
            );
        }

        const session = await prisma.fakturAbsensi.create({
            data: {
                date: new Date(date),
                salesName,
                notes: notes || null,
            }
        });

        return NextResponse.json({ session }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
