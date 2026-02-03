
import fs from 'fs';
import path from 'path';

function loadEnv(filename: string) {
    try {
        const envPath = path.resolve(process.cwd(), filename);
        if (fs.existsSync(envPath)) {
            const env = fs.readFileSync(envPath, 'utf8');
            env.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const val = match[2].trim().replace(/^["']|["']$/g, '');
                    process.env[key] = val;
                }
            });
        }
    } catch (e) { }
}
loadEnv('.env');
loadEnv('.env.local');

import { SchedulerService } from './services/scheduler';

async function run() {
    console.log("=== MANUAL SYNC TEST ===");
    console.log("Starting runSyncJob...");

    try {
        const result = await SchedulerService.runSyncJob();
        console.log("Sync Result:", result);
    } catch (e: any) {
        console.error("Sync Error:", e);
    }
}

run();
