import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        // Admin only
        const cookieStore = await cookies();
        const role = cookieStore.get('user_role')?.value || 'STAFF';
        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Export all tables
        const [
            soSessions,
            soItems,
            users,
            roleConfigs,
            customers,
            receivables,
            broadcastSchedules,
            broadcastLogs,
            systemSettings,
            fakturAbsensi,
            fakturAbsensiItems,
            monitorReturns,
        ] = await Promise.all([
            prisma.soSession.findMany(),
            prisma.soItem.findMany(),
            prisma.user.findMany(),
            prisma.roleConfig.findMany(),
            prisma.customer.findMany(),
            prisma.receivable.findMany(),
            prisma.broadcastSchedule.findMany(),
            prisma.broadcastLog.findMany(),
            prisma.systemSetting.findMany(),
            prisma.fakturAbsensi.findMany(),
            prisma.fakturAbsensiItem.findMany(),
            prisma.monitorReturn.findMany(),
        ]);

        const backup = {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: {
                soSessions,
                soItems,
                users,
                roleConfigs,
                customers,
                receivables,
                broadcastSchedules,
                broadcastLogs,
                systemSettings,
                fakturAbsensi,
                fakturAbsensiItems,
                monitorReturns,
            },
            counts: {
                soSessions: soSessions.length,
                soItems: soItems.length,
                users: users.length,
                roleConfigs: roleConfigs.length,
                customers: customers.length,
                receivables: receivables.length,
                broadcastSchedules: broadcastSchedules.length,
                broadcastLogs: broadcastLogs.length,
                systemSettings: systemSettings.length,
                fakturAbsensi: fakturAbsensi.length,
                fakturAbsensiItems: fakturAbsensiItems.length,
                monitorReturns: monitorReturns.length,
            }
        };

        const jsonStr = JSON.stringify(backup, null, 2);
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

        return new NextResponse(jsonStr, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="SOFAKTUR_BACKUP_${dateStr}.json"`,
            },
        });
    } catch (error: any) {
        console.error('Backup error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
