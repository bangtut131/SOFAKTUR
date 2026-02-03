import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...vals] = line.split('=');
            if (key && vals.length > 0) {
                process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
            }
        });
    }
}
loadEnv();

import { prisma } from './src/lib/prisma';
import { AccurateServerService } from './src/services/accurateServer';

const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    try {
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }
        return new Date(dateStr);
    } catch (e) { return new Date(); }
};

async function syncYear(year: number) {
    console.log(`--- Syncing Year ${year} ---`);
    const result = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        fromDate: `01/01/${year}`,
        toDate: `31/12/${year}`,
        page: 1,
        limit: 200 // Maximum stable limit
    } as any);

    if (result.error) {
        console.error(`Error ${year}:`, result.error);
        return 0;
    }

    if (!result.invoices || result.invoices.length === 0) return 0;

    console.log(`Found ${result.invoices.length} in ${year}. Total in DB before:`, await prisma.receivable.count());

    for (const inv of result.invoices) {
        let customer = await prisma.customer.findUnique({ where: { accurateId: inv.customerAccurateId } });
        if (!customer) customer = await prisma.customer.findFirst({ where: { name: inv.customerName } });
        if (!customer) {
            customer = await prisma.customer.create({
                data: { accurateId: inv.customerAccurateId || `TEMP-${Date.now()}`, name: inv.customerName }
            });
        }

        await prisma.receivable.upsert({
            where: { transNo: inv.transNo },
            update: {
                outstanding: inv.outstanding,
                amount: inv.amount,
                status: inv.outstanding <= 0 ? 'PAID' : 'OPEN'
            },
            create: {
                customerId: customer.id,
                transNo: inv.transNo,
                transDate: parseDate(inv.transDate),
                dueDate: parseDate(inv.dueDate),
                amount: inv.amount,
                outstanding: inv.outstanding,
                status: 'OPEN'
            }
        });
    }
    return result.invoices.length;
}

async function main() {
    let total = 0;
    for (let y = 2026; y >= 2014; y--) {
        total += await syncYear(y);
    }
    console.log("Total Processed:", total);
    const stats = await prisma.receivable.aggregate({
        _sum: { outstanding: true },
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    console.log("Final Sum in DB:", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats._sum.outstanding || 0));
}
main();
