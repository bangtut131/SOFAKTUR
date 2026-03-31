import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { waDeviceManager } from '@/services/wa-device-manager';

export const dynamic = 'force-dynamic';

// GET: Check device connection status
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams?.id || req.nextUrl.pathname.split('/devices/')[1]?.split('/')[0];
        if (!id) return NextResponse.json({ error: 'Device ID tidak valid' }, { status: 400 });
        const device = await prisma.waDevice.findUnique({ where: { id } });
        if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

        // Get live status from device manager
        const live = waDeviceManager.getStatus(device.sessionId);

        // Update DB
        await prisma.waDevice.update({
            where: { id },
            data: {
                status: live.status || 'DISCONNECTED',
                phone: live.phone || device.phone,
            },
        });

        return NextResponse.json({
            success: true,
            status: live.status || 'DISCONNECTED',
            phone: live.phone || device.phone,
        });
    } catch (error: any) {
        console.error('[Device Status] Error:', error);
        return NextResponse.json({ error: 'Gagal mengecek status device' }, { status: 500 });
    }
}
