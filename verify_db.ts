import { prisma } from './src/lib/prisma';

async function main() {
    try {
        console.log("Checking System Settings...");
        const settings = await prisma.systemSetting.findMany({
            where: { key: 'SYNC_PROGRESS_PIUTANG' }
        });
        console.log("Settings:", settings);

        console.log("\nChecking Receivables...");
        const receivables = await prisma.receivable.findMany({
            take: 5,
            orderBy: { lastSyncedAt: 'desc' }
        });
        console.log(`Found ${receivables.length} receivables.`);
        receivables.forEach(r => {
            console.log(`- ${r.transNo}: Status=${r.status}, Outstanding=${r.outstanding}, CustomerId=${r.customerId}`);
        });

        console.log("\nChecking Customers...");
        const customers = await prisma.customer.findMany({
            take: 5
        });
        console.log(`Found ${customers.length} customers.`);
        console.log(customers);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
