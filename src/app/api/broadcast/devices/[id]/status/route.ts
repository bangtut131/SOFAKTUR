import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { waDeviceManager } from '@/services/wa-device-manager';

export const dynamic = 'force-dynamic';

// GET: Check device connection status
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const device = await prisma.waDevice.findUnique({ where: { id: params.id } });
        if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

        // Get live status from device manager
        const live = waDeviceManager.getStatus(device.sessionId);

        // Update DB
        await prisma.waDevice.update({
            where: { id: params.id },
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
