
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking Schedules (JS mode)...");
        const schedules = await prisma.broadcastSchedule.findMany();
        console.log(JSON.stringify(schedules, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
