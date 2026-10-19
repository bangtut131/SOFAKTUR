import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

function getUsername(): string {
    try {
        const cookieStore = cookies();
        return cookieStore.get('username')?.value || 'system';
    } catch {
        return 'system';
    }
}

// DELETE /api/piutang/blacklist/[id]
// Whitelist (deactivate) a blacklist entry by its blacklist entry ID
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json().catch(() => ({}));
        const reason = body?.reason || null;

        const entry = await prisma.piutangBlacklist.findUnique({ where: { id } });
        if (!entry) {
            return NextResponse.json({ error: 'Entry tidak ditemukan' }, { status: 404 });
        }
        if (entry.status === 'INACTIVE') {
            return NextResponse.json({ error: 'Customer sudah diwhitelist sebelumnya' }, { status: 409 });
        }

        const username = getUsername();

        const updated = await prisma.piutangBlacklist.update({
            where: { id },
            data: {
                status: 'INACTIVE',
                removedBy: username,
                removedAt: new Date(),
                // Optionally store whitelist reason in reason field suffix
                reason: entry.reason
                    ? `${entry.reason} | Whitelist: ${reason || '-'}`
                    : reason ? `Whitelist: ${reason}` : entry.reason
            },
            include: {
                customer: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json({ success: true, entry: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
