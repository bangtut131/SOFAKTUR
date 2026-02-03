import * as fs from 'fs';
import * as path from 'path';

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

import { prisma } from './src/lib/prisma';
import { AccurateServerService } from './src/services/accurateServer';

const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    try {
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        if (parts.length === 3) {
            if (dateStr.includes('/')) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    } catch (e) { }
    return new Date(dateStr);
};

async function main() {
    console.log("--- DEFINITIVE SYNC: Multi-Branch Monthly ---");
    const branches = [
        { id: 1, name: "Kantor Pusat" },
        { id: 350, name: "Cabang NTT" },
        { id: 250, name: "SMG" }
    ];

    let totalSaved = 0;
    const stopYear = 2014;

    for (const branch of branches) {
        console.log(`\nSyncing Branch: ${branch.name}`);
        const now = new Date();
        let curYear = now.getFullYear();
        let curMonth = now.getMonth();

        while (curYear >= stopYear) {
            const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
            const fromDate = `01/${String(curMonth + 1).padStart(2, '0')}/${curYear}`;
            const toDate = `${lastDay}/${String(curMonth + 1).padStart(2, '0')}/${curYear}`;

            const res = await AccurateServerService.fetchInvoices({
                owingStatus: 'UNPAID',
                fromDate, toDate,
                branchId: String(branch.id),
                page: 1, limit: 200
            } as any);

            if (res.invoices && res.invoices.length > 0) {
                console.log(`   ${fromDate}: Found ${res.invoices.length}`);
                for (const inv of res.invoices) {
                    let customer = await prisma.customer.findUnique({ where: { accurateId: inv.customerAccurateId } });
                    if (!customer) customer = await prisma.customer.findFirst({ where: { name: inv.customerName } });
                    if (!customer) {
                        customer = await prisma.customer.create({ data: { accurateId: inv.customerAccurateId || `TEMP-${Date.now()}`, name: inv.customerName } });
                    }
                    await prisma.receivable.upsert({
                        where: { transNo: inv.transNo },
                        update: { outstanding: inv.outstanding, amount: inv.amount, status: inv.outstanding <= 0 ? 'PAID' : 'OPEN' },
                        create: {
                            customerId: customer.id, transNo: inv.transNo,
                            transDate: parseDate(inv.transDate), dueDate: parseDate(inv.dueDate),
                            amount: inv.amount, outstanding: inv.outstanding, status: 'OPEN'
                        }
                    });
                    totalSaved++;
                }
            }

            curMonth--;
            if (curMonth < 0) { curMonth = 11; curYear--; }
        }
    }

    const stats = await prisma.receivable.aggregate({
        _sum: { outstanding: true },
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    console.log("\n--- SYNC FINISHED ---");
    console.log("Total Invoices Processed:", totalSaved);
    console.log("FINAL SUM IN DB:", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats._sum.outstanding || 0));
}
main();
