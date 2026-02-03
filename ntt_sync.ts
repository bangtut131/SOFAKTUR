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
    console.log("--- SMG TARGETED SYNC ---");
    const branchId = '250';
    let totalSaved = 0;

    // Fetch Page 1-10 for NTT since we know it has ~1200 invoices
    // Use the Sliding Date Window or just high page size?
    // Wait, Page 2 fails!
    // So use the Moving Window from ultimate_sync.ts

    let fromDate = '01/01/2000';
    let hasMore = true;
    const processedIds = new Set<string>();

    while (hasMore) {
        console.log(`Fetching NTT from ${fromDate}...`);
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            fromDate: fromDate,
            page: 1,
            limit: 200,
            branchId: branchId,
            sort: 'transDate|asc'
        } as any);

        if (res.error || !res.invoices || res.invoices.length === 0) break;

        let newInBatch = 0;
        let lastDate = fromDate;

        for (const inv of res.invoices) {
            lastDate = inv.transDate;
            if (processedIds.has(inv.transNo)) continue;
            processedIds.add(inv.transNo);

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
            newInBatch++;
            totalSaved++;
        }

        console.log(`   Batch: ${newInBatch} new. Last Date: ${lastDate}`);
        if (newInBatch === 0) {
            const d = parseDate(lastDate);
            d.setDate(d.getDate() + 1);
            fromDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } else {
            fromDate = lastDate;
        }

        if (res.invoices.length < 200) hasMore = false;
        if (totalSaved > 5000) break;
    }

    const stats = await prisma.receivable.aggregate({
        _sum: { outstanding: true },
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    console.log("FINAL NTT TOTAL:", stats._sum.outstanding);
}
main();
