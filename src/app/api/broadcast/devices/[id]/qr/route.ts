import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WahaService } from '@/services/waha';

export const dynamic = 'force-dynamic';

// GET: Get QR code for a device
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const device = await prisma.waDevice.findUnique({ where: { id: params.id } });
        if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

        const config = await WahaService.getConfig();
        const headers: any = {};
        if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

        // Get QR code as base64
        const qrRes = await fetch(`${config.baseUrl}/api/${device.sessionId}/auth/qr?format=raw`, {
            headers,
        });

        if (!qrRes.ok) {
            // Maybe already authenticated or session issue
            const errText = await qrRes.text();
            return NextResponse.json({ error: `QR not available: ${errText}`, qr: null });
        }

        const qrData = await qrRes.json();

        return NextResponse.json({
            success: true,
            qr: qrData.value || qrData.data || qrData,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
