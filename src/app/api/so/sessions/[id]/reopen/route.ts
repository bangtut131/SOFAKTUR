import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // Hanya ADMIN yang boleh reopen
        const cookieStore = await cookies();
        const role = cookieStore.get('user_role')?.value || 'STAFF';

        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: hanya Admin yang dapat membuka kunci SO.' }, { status: 403 });
        }

        const session = await prisma.soSession.findUnique({ where: { id }, select: { status: true } });
        if (!session) {
            return NextResponse.json({ error: 'Session tidak ditemukan.' }, { status: 404 });
        }
        if (session.status !== 'FINALIZED') {
            return NextResponse.json({ error: `Session tidak dalam status FINALIZED (status saat ini: ${session.status}).` }, { status: 400 });
        }

        const updated = await prisma.soSession.update({
            where: { id },
            data: { status: 'OPEN' }
        });

        return NextResponse.json({ success: true, session: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
