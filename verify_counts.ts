import { prisma } from './src/lib/prisma';

async function main() {
    try {
        const openReceivablesCount = await prisma.receivable.count({
            where: {
                status: 'OPEN',
                outstanding: { gt: 0 }
            }
        });

        const customersWithPiutang = await prisma.customer.findMany({
            where: {
                receivables: {
                    some: {
                        status: 'OPEN',
                        outstanding: { gt: 0 }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                phone: true
            }
        });

        const totalCustomers = await prisma.customer.count();
        const customersWithPhone = customersWithPiutang.filter(c => c.phone && c.phone.trim() !== "");

        console.log("--- Database Stats ---");
        console.log("Total Customers in DB:", totalCustomers);
        console.log("Customers with Outstanding Balance:", customersWithPiutang.length);
        console.log("Open Receivables (Invoices):", openReceivablesCount);
        console.log("Customers with Piutang HAVING Phone Number:", customersWithPhone.length);
        console.log("Customers with Piutang MISSING Phone Number:", customersWithPiutang.length - customersWithPhone.length);

        if (customersWithPiutang.length > 0) {
            console.log("\nSample Customers (first 5):");
            customersWithPiutang.slice(0, 5).forEach(c => {
                console.log(`- ${c.name}: ${c.phone || 'MISSING'}`);
            });
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
