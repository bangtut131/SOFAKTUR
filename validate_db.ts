import { prisma } from './src/lib/prisma';

async function main() {
    console.log("=== DB VALIDATION ===");
    const count = await prisma.receivable.count({
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    const sum = await prisma.receivable.aggregate({
        _sum: { outstanding: true },
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    console.log("Invoice Count:", count);
    console.log("Total Amount:", sum._sum.outstanding);

    const customerCount = await prisma.customer.count({
        where: { receivables: { some: { status: 'OPEN', outstanding: { gt: 0 } } } }
    });
    console.log("Customer Count with Piutang:", customerCount);

    if (count > 0) {
        const sample = await prisma.receivable.findFirst({
            where: { status: 'OPEN', outstanding: { gt: 0 } },
            orderBy: { transDate: 'asc' }
        });
        console.log("Oldest Invoice Date:", sample?.transDate);
    }
}
main();
