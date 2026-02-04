import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SchedulerService } from '@/services/scheduler';

export async function GET() {
    try {
        const schedules = await prisma.broadcastSchedule.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ success: true, schedules });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, type, cronExpression, isEnabled, messageTemplate, minDaysSinceTrans, minDaysOverdue, branchId, startDate, endDate, invoiceStatus } = body;

        let schedule;
        if (id) {
            // Update
            schedule = await prisma.broadcastSchedule.update({
                where: { id },
                data: {
                    name,
                    type,
                    cronExpression,
                    isEnabled,
                    messageTemplate,
                    minDaysSinceTrans,
                    minDaysOverdue,
                    branchId: branchId || null,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    invoiceStatus: invoiceStatus || 'UNPAID'
                }
            });
        } else {
            // Create
            schedule = await prisma.broadcastSchedule.create({
                data: {
                    name: name || `New Schedule ${Date.now()}`,
                    type: type || 'BROADCAST',
                    cronExpression: cronExpression || '0 8 * * *',
                    isEnabled: isEnabled || false,
                    messageTemplate,
                    minDaysSinceTrans,
                    minDaysOverdue,
                    branchId: branchId || null,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    invoiceStatus: invoiceStatus || 'UNPAID'
                }
            });
        }

        // Re-init scheduler
        await SchedulerService.initScheduler();

        return NextResponse.json({ success: true, schedule });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        await prisma.broadcastSchedule.delete({ where: { id } });
        await SchedulerService.initScheduler();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
