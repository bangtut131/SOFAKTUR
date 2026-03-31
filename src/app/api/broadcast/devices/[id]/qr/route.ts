import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { waDeviceManager } from '@/services/wa-device-manager';

export const dynamic = 'force-dynamic';

// GET: Get QR code for a device
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        // Fallback: extract id from URL if params doesn't resolve properly
        const id = resolvedParams?.id || req.nextUrl.pathname.split('/devices/')[1]?.split('/')[0];
        if (!id) return NextResponse.json({ error: 'Device ID tidak valid', qr: null }, { status: 400 });
        const device = await prisma.waDevice.findUnique({ where: { id } });
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
        return NextResponse.json({ error: 'Gagal memuat QR Code. Silakan coba lagi.', qr: null }, { status: 500 });
    }
}
