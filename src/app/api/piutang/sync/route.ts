import { NextResponse } from 'next/server';
import { SchedulerService } from '@/services/scheduler';

export async function POST(request: Request) {
    try {
        console.log("Manual Sync Triggered");

        // Trigger manual run - FIRE AND FORGET to avoid timeout
        SchedulerService.runSyncJob().catch(err => {
            console.error("Background Sync Error:", err);
        });

        // Return immediately
        return NextResponse.json({ success: true, message: `Sync job started in background. Please wait...` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
