
import { SchedulerService } from './services/scheduler';
import { prisma } from './lib/prisma';

async function main() {
    try {
        console.log("Searching for a schedule with branchId...");
        const schedule = await prisma.broadcastSchedule.findFirst({
            where: {
                branchId: { not: null },
                type: 'SYNC'
            }
        });

        if (!schedule) {
            console.log("No SYNC schedule with branchId found.");
            return;
        }

        console.log(`Found Schedule: ${schedule.name} (ID: ${schedule.id})`);
        console.log(`Target Branch ID: ${schedule.branchId}`);

        // Mock syncCustomers to speed up test
        SchedulerService.syncCustomers = async () => { console.log("[DEBUG] Skipping Customer Sync"); };

        console.log("Running Sync Job...");
        await SchedulerService.runSyncJob(schedule.id);

    } catch (e) {
        console.error("Execution Error:", e);
    }
}

main();
