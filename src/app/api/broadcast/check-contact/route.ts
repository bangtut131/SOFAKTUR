import { NextRequest, NextResponse } from 'next/server';
import { WahaService } from '@/services/waha';

export async function POST(req: NextRequest) {
    try {
        const { phones } = await req.json();

        if (!phones || !Array.isArray(phones) || phones.length === 0) {
            return NextResponse.json({ error: 'phones array required' }, { status: 400 });
        }

        const results = await WahaService.checkContacts(phones);
        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Check contact error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
