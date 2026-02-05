
import { prisma } from './lib/prisma';

async function main() {
    try {
        console.log("Checking BroadcastSchedules...");
        const schedules = await prisma.broadcastSchedule.findMany();

        if (schedules.length === 0) {
            console.log("No schedules found.");
        }

        schedules.forEach(s => {
            console.log(`[${s.type}] ${s.name} (ID: ${s.id})`);
            console.log(`   Enabled: ${s.isEnabled}`);
            console.log(`   BranchID: ${s.branchId} (${typeof s.branchId})`);
            console.log(`   Params: Status=${s.invoiceStatus}, Start=${s.startDate}, End=${s.endDate}`);
            console.log('-------------------------------------------');
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
