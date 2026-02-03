import { prisma } from './src/lib/prisma';
import { SchedulerService } from './src/services/scheduler';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("--- Diagnostics & Sync ---");
    const filePath = path.resolve(process.cwd(), 'src/services/scheduler.ts');
    console.log("Reading file from:", filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if it contains the new limit
    if (content.includes('limit: 5000')) {
        console.log("CONFIRMED: limit: 5000 is present in the file.");
    } else {
        console.log("WARNING: limit: 5000 NOT FOUND in the file!");
        console.log("Content Sample:", content.substring(content.indexOf('runSyncJob'), content.indexOf('runSyncJob') + 500));
    }

    console.log("\nStarting Sync...");
    const result = await SchedulerService.runSyncJob();
    console.log("Result:", JSON.stringify(result, null, 2));

    const finalStats = await prisma.receivable.aggregate({
        _sum: { outstanding: true },
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    console.log("Final Amount:", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(finalStats._sum.outstanding || 0));
}
main();
