import * as fs from 'fs';
import * as path from 'path';

// Manual Env Loading
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...vals] = line.split('=');
            if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
        });
    }
}
loadEnv();

import { SchedulerService } from './src/services/scheduler';
import { prisma } from './src/lib/prisma';

async function main() {
    console.log("--- Testing Application Sync Logic ---");
    const result = await SchedulerService.runSyncJob();
    console.log("Sync Result:", result);

    const stats = await prisma.receivable.aggregate({
        _sum: { outstanding: true },
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    console.log("FINAL SUM:", stats._sum.outstanding);
    console.log("TOTAL RECORDS:", await prisma.receivable.count());
}
main();
