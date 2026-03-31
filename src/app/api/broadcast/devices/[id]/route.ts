import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { waDeviceManager } from '@/services/wa-device-manager';

// DELETE: Remove a device
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams?.id || req.nextUrl.pathname.split('/devices/')[1]?.split('/')[0];
        if (!id) return NextResponse.json({ error: 'Device ID tidak valid' }, { status: 400 });
        const device = await prisma.waDevice.findUnique({ where: { id } });
        if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

        // Destroy whatsapp-web.js client
        await waDeviceManager.destroyDevice(device.sessionId);

        // Delete from DB
        await prisma.waDevice.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Device Delete] Error:', error);
        return NextResponse.json({ error: 'Gagal menghapus device' }, { status: 500 });
    }
}
