import * as fs from 'fs';
import * as path from 'path';

// --- Manual Env Loading ---
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...vals] = line.split('=');
            if (key && vals.length > 0) {
                process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
            }
        });
        console.log("Loaded .env.local manually.");
    }
}
loadEnv();

import { prisma } from './src/lib/prisma';
import { SchedulerService } from './src/services/scheduler';

async function main() {
    console.log("--- Starting Sync Manual (Monthly Chunks) ---");
    try {
        const result = await SchedulerService.runSyncJob();
        console.log("Sync Results:", JSON.stringify(result, null, 2));

        const stats = await prisma.receivable.aggregate({
            _sum: { outstanding: true },
            _count: { id: true },
            where: { status: 'OPEN', outstanding: { gt: 0 } }
        });

        console.log("Final Sum:", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats._sum.outstanding || 0));
        console.log("Final Count:", stats._count.id);
    } catch (e) {
        console.error("Sync Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
