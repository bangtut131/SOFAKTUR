import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET Settings
export async function GET() {
    try {
        const configs = await prisma.roleConfig.findMany();
        return NextResponse.json({ success: true, configs });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// SAVE Settings
export async function POST(request: Request) {
    try {
        const { role, visibleColumns } = await request.json();

        const config = await prisma.roleConfig.upsert({
            where: { role },
            update: { visibleColumns: JSON.stringify(visibleColumns) },
            create: { role, visibleColumns: JSON.stringify(visibleColumns) }
        });

        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
