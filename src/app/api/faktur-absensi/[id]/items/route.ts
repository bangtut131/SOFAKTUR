import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Add item to session
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const { transNo, customerName, amount, remarks } = await request.json();

        if (!transNo) {
            return NextResponse.json(
                { error: 'Nomor faktur wajib diisi' },
                { status: 400 }
            );
        }

        // Check if session exists and is OPEN
        const session = await prisma.fakturAbsensi.findUnique({ where: { id } });
        if (!session) {
            return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
        }
        if (session.status !== 'OPEN') {
            return NextResponse.json({ error: 'Sesi sudah ditutup' }, { status: 400 });
        }

        // Check duplicate transNo in same session
        const existing = await prisma.fakturAbsensiItem.findFirst({
            where: { absensiId: id, transNo }
        });
        if (existing) {
            return NextResponse.json(
                { error: `Faktur ${transNo} sudah ada di sesi ini` },
                { status: 400 }
            );
        }

        const item = await prisma.fakturAbsensiItem.create({
            data: {
                absensiId: id,
                transNo,
                customerName: customerName || '-',
                amount: amount || 0,
                remarks: remarks || null,
            }
        });

        return NextResponse.json({ item }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove item from session
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: absensiId } = await params;

    try {
        const { itemId } = await request.json();

        if (!itemId) {
            return NextResponse.json({ error: 'itemId wajib diisi' }, { status: 400 });
        }

        await prisma.fakturAbsensiItem.delete({
            where: { id: itemId, absensiId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
