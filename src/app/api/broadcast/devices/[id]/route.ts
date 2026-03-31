import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WahaService } from '@/services/waha';

// DELETE: Remove a device
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const device = await prisma.waDevice.findUnique({ where: { id: params.id } });
        if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

        // Try to stop WAHA session
        try {
            const config = await WahaService.getConfig();
            const headers: any = {};
            if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

            await fetch(`${config.baseUrl}/api/sessions/${device.sessionId}`, {
                method: 'DELETE',
                headers,
            });
        } catch (e) {
            console.warn('Could not delete WAHA session:', e);
        }

        // Delete from DB
        await prisma.waDevice.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
