import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { waDeviceManager } from '@/services/wa-device-manager';

// GET: List all devices (with live status from manager)
export async function GET() {
    try {
        const devices = await prisma.waDevice.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // Merge live status from device manager
        const result = devices.map(d => {
            const live = waDeviceManager.getStatus(d.sessionId);
            return {
                ...d,
                status: live.status || d.status,
                phone: live.phone || d.phone,
            };
        });

        return NextResponse.json({ success: true, devices: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Register a new device & start whatsapp-web.js client
export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

        // Generate a unique session ID
        const sessionId = `device_${Date.now()}`;

        // Save to DB first
        const device = await prisma.waDevice.create({
            data: {
                name,
                sessionId,
                status: 'INITIALIZING',
            },
        });

        // Initialize whatsapp-web.js client (runs in background)
        waDeviceManager.initDevice(device.id, sessionId, name).then(session => {
            // Update DB status once QR or connected
            const interval = setInterval(async () => {
                const s = waDeviceManager.getStatus(sessionId);
                if (s.status === 'CONNECTED' || s.status === 'SCAN_QR') {
                    await prisma.waDevice.update({
                        where: { id: device.id },
                        data: { status: s.status, phone: s.phone || undefined },
                    }).catch(() => {});
                    if (s.status === 'CONNECTED') clearInterval(interval);
                }
            }, 3000);

            // Clear interval after 5 minutes
            setTimeout(() => clearInterval(interval), 300000);
        }).catch(err => {
            console.error('[Device] Init error:', err);
        });

        return NextResponse.json({ success: true, device });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
