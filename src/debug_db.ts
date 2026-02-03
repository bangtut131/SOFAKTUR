
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function run() {
    let output = "=== DEBUG DB CONTENT ===\n";

    try {
        const custCount = await prisma.customer.count();
        output += `Total Customers: ${custCount}\n`;

        const recCount = await prisma.receivable.count();
        output += `Total Receivables: ${recCount}\n`;

        const openRecCount = await prisma.receivable.count({ where: { status: 'OPEN', outstanding: { gt: 0 } } });
        output += `Open Receivables: ${openRecCount}\n`;

        // Get total outstanding amount
        const totalOutstanding = await prisma.receivable.aggregate({
            _sum: { outstanding: true },
            where: { status: 'OPEN', outstanding: { gt: 0 } }
        });
        const totalRupiah = totalOutstanding._sum.outstanding || 0;
        output += `Total Outstanding: Rp ${totalRupiah.toLocaleString('id-ID')}\n`;

        // Get customer count with open receivables
        const custWithReceivables = await prisma.customer.count({
            where: { receivables: { some: { status: 'OPEN', outstanding: { gt: 0 } } } }
        });
        output += `Customers with Open Receivables: ${custWithReceivables}\n`;

        if (recCount > 0) {
            const sample = await prisma.receivable.findFirst({
                orderBy: { transDate: 'desc' },
                include: { customer: true }
            });
            output += "Latest Receivable:\n" + JSON.stringify(sample, null, 2);
        }

    } catch (e: any) {
        output += "DB Error: " + e.message;
    } finally {
        await prisma.$disconnect();
    }

    fs.writeFileSync('db_status.txt', output, 'utf8');
    console.log("Written to db_status.txt");
}

run();
