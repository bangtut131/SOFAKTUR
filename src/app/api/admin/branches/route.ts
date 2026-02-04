
import { NextResponse } from 'next/server';
import { AccurateServerService } from '@/services/accurateServer';

export async function GET() {
    try {
        const branches = await AccurateServerService.getBranches();
        return NextResponse.json({ success: true, branches });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
