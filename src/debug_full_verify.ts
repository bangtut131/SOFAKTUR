import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { AccurateServerService } from './services/accurateServer';
import fs from 'fs';

async function fullVerification() {
    let output = "=== FULL ACCURATE DATA VERIFICATION ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    try {
        const branches = await AccurateServerService.getBranches();
        output += `Total Branches: ${branches.length}\n\n`;

        let grandTotalInvoices = 0;
        let grandTotalAmount = 0;

        for (const branch of branches) {
            output += `\n=== ${branch.name} (ID: ${branch.id}) ===\n`;

            let page = 1;
            let hasMore = true;
            let branchCount = 0;
            let branchAmount = 0;

            while (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limit

                const res = await AccurateServerService.fetchInvoices({
                    owingStatus: 'UNPAID',
                    page: page,
                    limit: 100,
                    branchId: String(branch.id)
                } as any);

                if (res.error) {
                    output += `  Page ${page} ERROR: ${res.error}\n`;
                    hasMore = false;
                    continue;
                }

                if (res.invoices && res.invoices.length > 0) {
                    const pageAmount = res.invoices.reduce((sum: number, inv: any) => sum + inv.outstanding, 0);
                    branchCount += res.invoices.length;
                    branchAmount += pageAmount;

                    output += `  Page ${page}: ${res.invoices.length} invoices, Rp ${pageAmount.toLocaleString('id-ID')}\n`;

                    if (res.invoices.length < 100) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    output += `  Page ${page}: No more data\n`;
                    hasMore = false;
                }
            }

            output += `  BRANCH TOTAL: ${branchCount} invoices, Rp ${branchAmount.toLocaleString('id-ID')}\n`;
            grandTotalInvoices += branchCount;
            grandTotalAmount += branchAmount;
        }

        output += `\n\n========== GRAND TOTAL ==========\n`;
        output += `Total Invoices: ${grandTotalInvoices}\n`;
        output += `Total Outstanding: Rp ${grandTotalAmount.toLocaleString('id-ID')}\n`;
        output += `================================\n`;

    } catch (e: any) {
        output += `\nERROR: ${e.message}\n`;
        output += e.stack;
    }

    fs.writeFileSync('full_verification.txt', output, 'utf8');
    console.log("Written to full_verification.txt");
    console.log(output);
}

fullVerification();
