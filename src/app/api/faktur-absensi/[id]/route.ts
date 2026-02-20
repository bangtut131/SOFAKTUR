import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get session detail with items
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const session = await prisma.fakturAbsensi.findUnique({
            where: { id },
            include: {
                items: {
                    orderBy: { handedAt: 'desc' }
                }
            }
        });

        if (!session) {
            return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ session });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Update session (notes, status)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const data: any = {};
        if (body.notes !== undefined) data.notes = body.notes;
        if (body.status !== undefined) data.status = body.status;
        if (body.salesName !== undefined) data.salesName = body.salesName;

        const session = await prisma.fakturAbsensi.update({
            where: { id },
            data,
        });

        return NextResponse.json({ session });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete session
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        await prisma.fakturAbsensi.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
