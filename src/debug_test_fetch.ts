import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { AccurateServerService } from './services/accurateServer';
import fs from 'fs';

async function testFetch() {
    let output = "=== TEST PIUTANG FETCH (NO BRANCH FILTER) ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    try {
        // Test without branch filter
        output += "--- Fetching ALL unpaid invoices (no branch filter) ---\n";

        let allInvoices: any[] = [];
        let page = 1;
        let hasMore = true;
        const LIMIT = 100;
        const MAX_PAGES = 50;

        while (hasMore && page <= MAX_PAGES) {
            output += `Page ${page}... `;

            const result = await AccurateServerService.fetchInvoices({
                owingStatus: 'UNPAID',
                page: page,
                limit: LIMIT
            });

            output += `invoices: ${result.invoices?.length || 0}, rawCount: ${result.rawCount || 'N/A'}\n`;

            if (result.error) {
                output += `ERROR: ${result.error}\n`;
                break;
            }

            allInvoices = [...allInvoices, ...result.invoices];

            // Check pagination
            const count = result.rawCount || result.invoices.length;
            if (count < LIMIT) {
                hasMore = false;
            } else {
                page++;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        output += `\nTotal fetched: ${allInvoices.length} invoices\n`;

        const totalOwing = allInvoices.reduce((sum, inv) => sum + (inv.outstanding || inv.primeOwing || 0), 0);
        output += `Total outstanding: Rp ${totalOwing.toLocaleString('id-ID')}\n`;

        // Check for Abadi Prima
        const abadiPrima = allInvoices.filter(inv => inv.customerName?.toLowerCase().includes('abadi prima'));
        output += `\nAbadi Prima invoices found: ${abadiPrima.length}\n`;
        if (abadiPrima.length > 0) {
            for (const inv of abadiPrima) {
                output += `  - ${inv.transNo}: Rp ${(inv.outstanding || inv.primeOwing || 0).toLocaleString('id-ID')}\n`;
            }
        }

        // Summary by branch
        const branchTotals = new Map<string, { count: number; total: number }>();
        for (const inv of allInvoices) {
            const branch = inv.branchName || 'Unknown';
            if (!branchTotals.has(branch)) {
                branchTotals.set(branch, { count: 0, total: 0 });
            }
            const bt = branchTotals.get(branch)!;
            bt.count++;
            bt.total += inv.outstanding || inv.primeOwing || 0;
        }

        output += `\n--- Summary by Branch ---\n`;
        for (const [branch, data] of branchTotals) {
            output += `${branch}: ${data.count} invoices, Rp ${data.total.toLocaleString('id-ID')}\n`;
        }

    } catch (e: any) {
        output += `\nEXCEPTION: ${e.message}\n${e.stack}`;
    }

    fs.writeFileSync('test_fetch_result.txt', output, 'utf8');
    console.log("Written to test_fetch_result.txt");
    console.log(output);
}

testFetch();
