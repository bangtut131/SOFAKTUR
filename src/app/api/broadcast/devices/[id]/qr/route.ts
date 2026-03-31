import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { waDeviceManager } from '@/services/wa-device-manager';

export const dynamic = 'force-dynamic';

// GET: Get QR code for a device
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const device = await prisma.waDevice.findUnique({ where: { id: params.id } });
        if (!device) return NextResponse.json({ error: 'Device not found', qr: null }, { status: 404 });

        // Check if device is already connected
        const live = waDeviceManager.getStatus(device.sessionId);
        if (live.status === 'CONNECTED') {
            return NextResponse.json({
                success: true,
                qr: null,
                message: 'Device sudah terhubung, tidak perlu scan QR lagi.',
            });
        }

        // Check if manager has the device running
        const existingDevice = waDeviceManager.getDevice(device.sessionId);
        if (!existingDevice) {
            // Re-initialize the device (might have been lost on server restart)
            console.log(`[QR] Device not in manager, re-initializing: ${device.sessionId}`);
            waDeviceManager.initDevice(device.id, device.sessionId, device.name).catch(e => {
                console.error('[QR] Re-init error:', e);
            });
            
            // Wait a bit for QR to be generated
            await new Promise(r => setTimeout(r, 5000));
        }

        // Get QR from manager
        const qr = waDeviceManager.getQr(device.sessionId);

        if (qr) {
            return NextResponse.json({ success: true, qr });
        }

        // Check status again
        const status = waDeviceManager.getStatus(device.sessionId);
        if (status.status === 'CONNECTED') {
            return NextResponse.json({
                success: true,
                qr: null,
                message: 'Device sudah terhubung!',
            });
        }

        if (status.status === 'INITIALIZING') {
            return NextResponse.json({
                success: false,
                qr: null,
                message: 'Device sedang inisialisasi, coba lagi dalam beberapa detik...',
            });
        }

        return NextResponse.json({
            success: false,
            qr: null,
            message: 'QR Code belum tersedia. Klik "Tampilkan QR" lagi.',
        });
    } catch (error: any) {
        console.error('[QR] Error:', error);
        return NextResponse.json({ error: error.message, qr: null }, { status: 500 });
    }
}
