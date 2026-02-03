import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SchedulerService } from '@/services/scheduler';

export async function GET() {
    try {
        const schedules = await prisma.broadcastSchedule.findMany();

        let wahaSettings: any[] = [];
        try {
            // Safely try to fetch settings, if table doesn't exist or client invalid, catch it
            wahaSettings = await prisma.systemSetting.findMany({
                where: { key: { in: ['WAHA_API_URL', 'WAHA_API_KEY', 'WAHA_SESSION_ID'] } }
            });
        } catch (e) {
            console.error("Failed to fetch SystemSettings:", e);
        }

        const getVal = (k: string) => wahaSettings.find(s => s.key === k)?.value;

        return NextResponse.json({
            schedules,
            wahaUrl: getVal('WAHA_API_URL') || '',
            wahaApiKey: getVal('WAHA_API_KEY') || '',
            wahaSessionId: getVal('WAHA_SESSION_ID') || ''
        });
    } catch (error: any) {
        console.error("GET Settings Error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, cronExpression, isEnabled, messageTemplate, name, id, wahaUrl, wahaApiKey, wahaSessionId } = body;

        // 1. Save WAHA Config if present
        if (wahaUrl !== undefined || wahaApiKey !== undefined || wahaSessionId !== undefined) {
            // Ensure SystemSetting exists
            try {
                if (wahaUrl !== undefined) await prisma.systemSetting.upsert({ where: { key: 'WAHA_API_URL' }, update: { value: wahaUrl }, create: { key: 'WAHA_API_URL', value: wahaUrl } });
                if (wahaApiKey !== undefined) await prisma.systemSetting.upsert({ where: { key: 'WAHA_API_KEY' }, update: { value: wahaApiKey }, create: { key: 'WAHA_API_KEY', value: wahaApiKey } });
                if (wahaSessionId !== undefined) await prisma.systemSetting.upsert({ where: { key: 'WAHA_SESSION_ID' }, update: { value: wahaSessionId }, create: { key: 'WAHA_SESSION_ID', value: wahaSessionId } });
            } catch (e: any) {
                console.error("Error saving SystemSetting:", e);
                // If table not found, likely migration issue.
                if (e.code === 'P2021') {
                    return NextResponse.json({ error: "Database table 'SystemSetting' missing. Please run update_db.bat" }, { status: 500 });
                }
                throw e;
            }
        }

        // 2. If it's ONLY a config update (no schedule fields), return success
        if (!type && !id && !name && !cronExpression) {
            return NextResponse.json({ success: true, message: "Settings saved" });
        }

        // 3. Handle Schedule Update/Create
        if (id) {
            // Update Schedule
            const updated = await prisma.broadcastSchedule.update({
                where: { id },
                data: {
                    cronExpression,
                    isEnabled,
                    messageTemplate,
                    // name // usually immutable
                }
            });
            await SchedulerService.initScheduler();
            return NextResponse.json({ success: true, schedule: updated });
        } else if (name && type && cronExpression) {
            // Create Schedule
            const created = await prisma.broadcastSchedule.create({
                data: {
                    name,
                    type,
                    cronExpression,
                    isEnabled,
                    messageTemplate
                }
            });
            await SchedulerService.initScheduler();
            return NextResponse.json({ success: true, schedule: created });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("POST Settings Error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
