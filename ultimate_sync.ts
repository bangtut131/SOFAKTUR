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
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
    } catch (e) { return new Date(); }
};

async function main() {
    console.log("--- ULTIMATE SYNC: Moving Ascending Window ---");
    let fromDate = '01/01/2000';
    let hasMore = true;
    let totalProcessed = 0;
    const processedIds = new Set<string>();

    while (hasMore) {
        console.log(`Fetching from ${fromDate}... (Processed so far: ${totalProcessed})`);
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            fromDate: fromDate,
            page: 1,
            limit: 200,
            sort: 'transDate|asc'
        } as any);

        if (res.error) {
            console.error("API Error:", res.error);
            break;
        }

        if (!res.invoices || res.invoices.length === 0) {
            console.log("No more invoices found.");
            break;
        }

        let newInBatch = 0;
        let lastDate = fromDate;

        for (const inv of res.invoices) {
            lastDate = inv.transDate;
            if (processedIds.has(inv.transNo)) continue;

            processedIds.add(inv.transNo);

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
            newInBatch++;
            totalProcessed++;
        }

        console.log(`   Batch finished. New invoices in this batch: ${newInBatch}. Last Date: ${lastDate}`);

        if (newInBatch === 0) {
            // If we found 0 new invoices but API returned 200, we are stuck on the same date.
            // Move fromDate by 1 day.
            const d = parseDate(lastDate);
            d.setDate(d.getDate() + 1);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            fromDate = `${day}/${month}/${year}`;
        } else {
            fromDate = lastDate;
        }

        if (res.invoices.length < 200 && newInBatch > 0) {
            // We reached the end of the total set
            // Wait! If totalCount is 2201, and we got < 200, it means we are at the very last page.
            console.log("Reached end of search range.");
            hasMore = false;
        }

        // Safety Break
        if (totalProcessed > 5000) break;
    }

    console.log("SUCCESS! Total Processed:", totalProcessed);
    const finalStats = await prisma.receivable.aggregate({
        _sum: { outstanding: true },
        where: { status: 'OPEN', outstanding: { gt: 0 } }
    });
    console.log("FINAL DB SUM:", finalStats._sum.outstanding);
}
main();
