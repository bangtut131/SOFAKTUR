import { NextResponse } from 'next/server';
import { SchedulerService } from '@/services/scheduler';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { scheduleId } = body;

        if (scheduleId) {
            // Manual trigger of specific schedule
            await SchedulerService.runBroadcastJob(scheduleId);
            return NextResponse.json({ success: true, message: "Broadcast job started" });
        } else {
            // Default logic if needed
            return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
