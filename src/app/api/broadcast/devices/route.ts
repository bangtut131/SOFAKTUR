import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WahaService } from '@/services/waha';

// GET: List all devices
export async function GET() {
    try {
        const devices = await prisma.waDevice.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ success: true, devices });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Register a new device
export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

        // Generate a unique session ID
        const sessionId = `device_${Date.now()}`;

        // Create WAHA session
        const config = await WahaService.getConfig();
        const headers: any = { 'Content-Type': 'application/json' };
        if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

        // Start session on WAHA
        const startRes = await fetch(`${config.baseUrl}/api/sessions/start`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: sessionId }),
        });

        if (!startRes.ok) {
            // Try alternative endpoint
            const startRes2 = await fetch(`${config.baseUrl}/api/sessions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: sessionId }),
            });
            if (!startRes2.ok) {
                const err = await startRes2.text();
                return NextResponse.json({ error: `WAHA session create failed: ${err}` }, { status: 500 });
            }
        }

        // Save to DB
        const device = await prisma.waDevice.create({
            data: {
                name,
                sessionId,
                status: 'SCAN_QR',
            },
        });

        return NextResponse.json({ success: true, device });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
