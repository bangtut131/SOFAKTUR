import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Sync absensi data to SO items
export async function POST() {
    try {
        // 1. Get ALL absensi items (both OUT and RETURNED)
        const allAbsensiItems = await prisma.fakturAbsensiItem.findMany({
            include: {
                absensi: { select: { salesName: true, date: true } }
            }
        });

        // Build a map: transNo → latest status
        // If ANY absensi record has it as OUT, it's still out
        const transNoStatusMap = new Map<string, { isOut: boolean; salesName: string; date: Date }>();

        for (const item of allAbsensiItems) {
            const current = transNoStatusMap.get(item.transNo);

            if (item.returnStatus === 'OUT') {
                // OUT takes priority
                transNoStatusMap.set(item.transNo, {
                    isOut: true,
                    salesName: item.absensi.salesName,
                    date: item.absensi.date,
                });
            } else if (!current || !current.isOut) {
                // Only set RETURNED if not already marked OUT by another record
                transNoStatusMap.set(item.transNo, {
                    isOut: false,
                    salesName: item.absensi.salesName,
                    date: item.absensi.date,
                });
            }
        }

        let updatedCount = 0;
        let resetCount = 0;

        // 2. Update SoItems based on the map
        for (const [transNo, info] of transNoStatusMap) {
            if (info.isOut) {
                // Mark as "Dibawa Sales" in SO + set scan status to MATCHED
                const result = await prisma.soItem.updateMany({
                    where: { transNo },
                    data: {
                        existenceStatus: 'Dibawa Sales',
                        status: 'MATCHED',
                        scannedAt: new Date(),
                        remarks: `Dibawa oleh: ${info.salesName} (${new Date(info.date).toLocaleDateString('id-ID')})`,
                    }
                });
                updatedCount += result.count;
            } else {
                // Reset only if currently "Dibawa Sales"
                const result = await prisma.soItem.updateMany({
                    where: {
                        transNo,
                        existenceStatus: 'Dibawa Sales',
                    },
                    data: {
                        existenceStatus: null,
                        remarks: null,
                    }
                });
                resetCount += result.count;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sync selesai. ${updatedCount} faktur ditandai "Dibawa Sales", ${resetCount} faktur direset.`,
            updatedCount,
            resetCount,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
