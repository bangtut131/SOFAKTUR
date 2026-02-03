import { prisma } from './src/lib/prisma';

async function main() {
    try {
        const stats = await prisma.receivable.aggregate({
            _sum: {
                outstanding: true
            },
            _count: {
                id: true
            },
            where: {
                status: 'OPEN',
                outstanding: { gt: 0 }
            }
        });

        console.log("--- Current DB Stats ---");
        console.log("Total Count:", stats._count.id);
        console.log("Total Amount:", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats._sum.outstanding || 0));

        // Check if there are any invoices with 0 outstanding but have primeOwing
        const weirdOnes = await prisma.receivable.count({
            where: {
                outstanding: 0,
                status: 'OPEN'
            }
        });
        console.log("Weird Invoices (Outstanding 0 but OPEN):", weirdOnes);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
