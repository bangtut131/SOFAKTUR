import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { AccurateServerService } from './services/accurateServer';
import fs from 'fs';

async function checkAccurateData() {
    let output = "=== ACCURATE DATA VERIFICATION ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    try {
        // 1. Get all branches
        output += "--- BRANCHES ---\n";
        const branches = await AccurateServerService.getBranches();
        output += `Total Branches: ${branches.length}\n`;
        branches.forEach(b => {
            output += `  - ${b.name} (ID: ${b.id})\n`;
        });
        output += "\n";

        // 2. Count invoices per branch
        output += "--- UNPAID INVOICES PER BRANCH ---\n";
        let grandTotal = 0;
        let grandTotalAmount = 0;

        for (const branch of branches) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit

            const count = await AccurateServerService.countUnpaidInvoicesByBranch(String(branch.id));
            output += `  ${branch.name}: ${count} invoices\n`;
            grandTotal += count;

            // Get first page to calculate sample total amount
            await new Promise(resolve => setTimeout(resolve, 500));
            const res = await AccurateServerService.fetchInvoices({
                owingStatus: 'UNPAID',
                page: 1,
                limit: 100,
                branchId: String(branch.id)
            } as any);

            if (res.invoices && res.invoices.length > 0) {
                const branchAmount = res.invoices.reduce((sum: number, inv: any) => sum + inv.outstanding, 0);
                grandTotalAmount += branchAmount;
                output += `    -> Page 1 Amount: Rp ${branchAmount.toLocaleString('id-ID')}\n`;

                // If totalCount from API available
                if (res.totalCount) {
                    output += `    -> API totalCount: ${res.totalCount}\n`;
                }
            }
        }

        output += `\n--- SUMMARY ---\n`;
        output += `Total Branches: ${branches.length}\n`;
        output += `Total Unpaid Invoices (counted): ${grandTotal}\n`;
        output += `Page 1 Amount Sample: Rp ${grandTotalAmount.toLocaleString('id-ID')}\n`;

        // 3. Test raw API call without branch filter
        output += "\n--- WITHOUT BRANCH FILTER ---\n";
        await new Promise(resolve => setTimeout(resolve, 500));
        const allRes = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            page: 1,
            limit: 100
        } as any);

        output += `Page 1 invoices: ${allRes.invoices?.length || 0}\n`;
        output += `API totalCount: ${allRes.totalCount || 'N/A'}\n`;
        if (allRes.invoices && allRes.invoices.length > 0) {
            const sampleAmount = allRes.invoices.reduce((sum: number, inv: any) => sum + inv.outstanding, 0);
            output += `Page 1 Amount: Rp ${sampleAmount.toLocaleString('id-ID')}\n`;
        }

    } catch (e: any) {
        output += `\nERROR: ${e.message}\n`;
        output += e.stack;
    }

    fs.writeFileSync('accurate_check.txt', output, 'utf8');
    console.log("Written to accurate_check.txt");
    console.log(output);
}

checkAccurateData();
