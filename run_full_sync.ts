import { prisma } from './src/lib/prisma';
import { SchedulerService } from './src/services/scheduler';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Manual env load if needed
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("--- Starting Comprehensive Sync Script ---");
    console.log("ACCURATE_DB_ID:", process.env.ACCURATE_DB_ID);

    try {
        const result = await SchedulerService.runSyncJob();
        console.log("Sync Final Results:", JSON.stringify(result, null, 2));

        // Final Verify
        const stats = await prisma.receivable.aggregate({
            _sum: { outstanding: true },
            _count: { id: true },
            where: { status: 'OPEN', outstanding: { gt: 0 } }
        });

        console.log("\n--- Post-Sync Verification ---");
        console.log("Total Count in DB:", stats._count.id);
        console.log("Total Amount in DB:", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats._sum.outstanding || 0));

    } catch (e) {
        console.error("Critical Sync Failure:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
