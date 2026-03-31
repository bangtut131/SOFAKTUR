import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WahaService } from '@/services/waha';

export const dynamic = 'force-dynamic';

// GET: Check device connection status
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const device = await prisma.waDevice.findUnique({ where: { id: params.id } });
        if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

        const config = await WahaService.getConfig();
        const headers: any = {};
        if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

        let status = 'DISCONNECTED';
        let phone = device.phone;

        try {
            // Check session info via WAHA
            const meRes = await fetch(`${config.baseUrl}/api/sessions/${device.sessionId}/me`, { headers });

            if (meRes.ok) {
                const meData = await meRes.json();
                status = 'CONNECTED';
                // Extract phone number from WAHA 'me' response
                if (meData.id) {
                    phone = meData.id.replace('@c.us', '').replace('@s.whatsapp.net', '');
                }
                if (meData.pushName) {
                    // Update phone in DB
                }
            } else {
                // Check if session exists but needs QR
                const sessRes = await fetch(`${config.baseUrl}/api/sessions`, { headers });
                if (sessRes.ok) {
                    const sessions = await sessRes.json();
                    const sess = (Array.isArray(sessions) ? sessions : sessions.data || [])
                        .find((s: any) => s.name === device.sessionId || s.id === device.sessionId);
                    if (sess) {
                        if (sess.status === 'SCAN_QR_CODE' || sess.status === 'SCAN_QR') {
                            status = 'SCAN_QR';
                        } else if (sess.status === 'WORKING' || sess.status === 'CONNECTED') {
                            status = 'CONNECTED';
                        } else {
                            status = 'DISCONNECTED';
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Status check failed:', e);
            status = 'DISCONNECTED';
        }

        // Update DB
        await prisma.waDevice.update({
            where: { id: params.id },
            data: { status, phone: phone || device.phone },
        });

        return NextResponse.json({ success: true, status, phone });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
