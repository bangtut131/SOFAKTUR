import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        // Admin only
        const cookieStore = await cookies();
        const role = cookieStore.get('user_role')?.value || 'STAFF';
        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { data, selectedTables } = body;

        if (!data) {
            return NextResponse.json({ error: 'Backup data tidak ditemukan' }, { status: 400 });
        }

        const results: Record<string, number> = {};

        // Helper: restore a table with upsert approach
        // Deletes existing data first, then creates from backup (full replace)
        const restoreTable = async (
            tableName: string,
            records: any[],
            deleteAll: () => Promise<any>,
            createMany: (data: any[]) => Promise<any>,
        ) => {
            if (!selectedTables || selectedTables.includes(tableName)) {
                if (records && records.length > 0) {
                    await deleteAll();
                    // Convert date strings back to Date objects
                    const processed = records.map(r => {
                        const obj = { ...r };
                        for (const key of Object.keys(obj)) {
                            if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
                                obj[key] = new Date(obj[key]);
                            }
                        }
                        return obj;
                    });
                    await createMany(processed);
                    results[tableName] = processed.length;
                } else {
                    results[tableName] = 0;
                }
            }
        };

        // IMPORTANT: Restore order matters because of foreign keys.
        // Parent tables first, then child tables.

        // 1. Independent tables (no foreign key dependencies)
        await restoreTable('users', data.users,
            () => prisma.user.deleteMany(),
            (d) => prisma.user.createMany({ data: d })
        );
        await restoreTable('roleConfigs', data.roleConfigs,
            () => prisma.roleConfig.deleteMany(),
            (d) => prisma.roleConfig.createMany({ data: d })
        );
        await restoreTable('systemSettings', data.systemSettings,
            () => prisma.systemSetting.deleteMany(),
            (d) => prisma.systemSetting.createMany({ data: d })
        );
        await restoreTable('broadcastSchedules', data.broadcastSchedules,
            () => prisma.broadcastSchedule.deleteMany(),
            (d) => prisma.broadcastSchedule.createMany({ data: d })
        );
        await restoreTable('broadcastLogs', data.broadcastLogs,
            () => prisma.broadcastLog.deleteMany(),
            (d) => prisma.broadcastLog.createMany({ data: d })
        );
        await restoreTable('monitorReturns', data.monitorReturns,
            () => prisma.monitorReturn.deleteMany(),
            (d) => prisma.monitorReturn.createMany({ data: d })
        );

        // 2. Parent tables with children — delete children first
        // SoSession -> SoItem
        if (!selectedTables || selectedTables.includes('soSessions') || selectedTables.includes('soItems')) {
            await prisma.soItem.deleteMany(); // child first
            await prisma.soSession.deleteMany(); // then parent

            if (data.soSessions?.length > 0) {
                await prisma.soSession.createMany({ data: data.soSessions.map((r: any) => {
                    const obj = { ...r };
                    delete obj.items; // Remove relation field
                    for (const key of Object.keys(obj)) {
                        if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
                            obj[key] = new Date(obj[key]);
                        }
                    }
                    return obj;
                }) });
                results['soSessions'] = data.soSessions.length;
            }
            if (data.soItems?.length > 0) {
                await prisma.soItem.createMany({ data: data.soItems.map((r: any) => {
                    const obj = { ...r };
                    delete obj.session; // Remove relation field
                    for (const key of Object.keys(obj)) {
                        if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
                            obj[key] = new Date(obj[key]);
                        }
                    }
                    return obj;
                }) });
                results['soItems'] = data.soItems.length;
            }
        }

        // Customer -> Receivable
        if (!selectedTables || selectedTables.includes('customers') || selectedTables.includes('receivables')) {
            await prisma.receivable.deleteMany();
            await prisma.customer.deleteMany();

            if (data.customers?.length > 0) {
                await prisma.customer.createMany({ data: data.customers.map((r: any) => {
                    const obj = { ...r };
                    delete obj.receivables;
                    for (const key of Object.keys(obj)) {
                        if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
                            obj[key] = new Date(obj[key]);
                        }
                    }
                    return obj;
                }) });
                results['customers'] = data.customers.length;
            }
            if (data.receivables?.length > 0) {
                await prisma.receivable.createMany({ data: data.receivables.map((r: any) => {
                    const obj = { ...r };
                    delete obj.customer;
                    for (const key of Object.keys(obj)) {
                        if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
                            obj[key] = new Date(obj[key]);
                        }
                    }
                    return obj;
                }) });
                results['receivables'] = data.receivables.length;
            }
        }

        // FakturAbsensi -> FakturAbsensiItem
        if (!selectedTables || selectedTables.includes('fakturAbsensi') || selectedTables.includes('fakturAbsensiItems')) {
            await prisma.fakturAbsensiItem.deleteMany();
            await prisma.fakturAbsensi.deleteMany();

            if (data.fakturAbsensi?.length > 0) {
                await prisma.fakturAbsensi.createMany({ data: data.fakturAbsensi.map((r: any) => {
                    const obj = { ...r };
                    delete obj.items;
                    for (const key of Object.keys(obj)) {
                        if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
                            obj[key] = new Date(obj[key]);
                        }
                    }
                    return obj;
                }) });
                results['fakturAbsensi'] = data.fakturAbsensi.length;
            }
            if (data.fakturAbsensiItems?.length > 0) {
                await prisma.fakturAbsensiItem.createMany({ data: data.fakturAbsensiItems.map((r: any) => {
                    const obj = { ...r };
                    delete obj.absensi;
                    for (const key of Object.keys(obj)) {
                        if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
                            obj[key] = new Date(obj[key]);
                        }
                    }
                    return obj;
                }) });
                results['fakturAbsensiItems'] = data.fakturAbsensiItems.length;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Restore berhasil!',
            results,
        });
    } catch (error: any) {
        console.error('Restore error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
