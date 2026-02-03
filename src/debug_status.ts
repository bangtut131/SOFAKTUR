
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function run() {
    let output = "=== SYNC STATUS CHECK ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    try {
        // Check sync status
        const syncStatus = await prisma.systemSetting.findUnique({
            where: { key: 'SYNC_PROGRESS_PIUTANG' }
        });
        output += "Sync Status:\n" + JSON.stringify(syncStatus, null, 2) + "\n\n";

        // Check receivables count
        const recCount = await prisma.receivable.count();
        const openRecCount = await prisma.receivable.count({ where: { status: 'OPEN', outstanding: { gt: 0 } } });
        output += `Total Receivables: ${recCount}\n`;
        output += `Open Receivables: ${openRecCount}\n\n`;

        // Check latest receivable
        const latest = await prisma.receivable.findFirst({
            orderBy: { lastSyncedAt: 'desc' }
        });
        output += "Latest Synced Receivable:\n" + JSON.stringify(latest, null, 2) + "\n\n";

        // Sum of outstanding
        const sum = await prisma.receivable.aggregate({
            _sum: { outstanding: true },
            where: { status: 'OPEN' }
        });
        output += `Total Outstanding: Rp ${sum._sum.outstanding?.toLocaleString('id-ID') || 0}\n`;

    } catch (e: any) {
        output += "Error: " + e.message;
    } finally {
        await prisma.$disconnect();
    }

    fs.writeFileSync('sync_status.txt', output, 'utf8');
    console.log(output);
}

run();
