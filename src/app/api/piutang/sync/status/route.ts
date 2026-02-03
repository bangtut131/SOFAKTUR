import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'SYNC_PROGRESS_PIUTANG' }
        });

        if (!setting) {
            return NextResponse.json({ current: 0, total: 0, status: 'IDLE' });
        }

        const data = JSON.parse(setting.value);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ current: 0, total: 0, status: 'ERROR' });
    }
}
