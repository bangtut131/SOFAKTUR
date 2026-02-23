import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Ensure this route is always evaluated dynamically

export async function GET() {
    try {
        // Simple query to wake up the database and keep the connection alive
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: 'success',
            message: 'Database ping successful. Supabase will not be paused.',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Database ping failed:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Database ping failed',
            error: error.message
        }, { status: 500 });
    }
}
