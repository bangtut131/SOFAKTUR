
import fs from 'fs';
import path from 'path';

function loadEnv(filename: string) {
    try {
        const envPath = path.resolve(process.cwd(), filename);
        if (fs.existsSync(envPath)) {
            const env = fs.readFileSync(envPath, 'utf8');
            env.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const val = match[2].trim().replace(/^["']|["']$/g, '');
                    process.env[key] = val;
                }
            });
        }
    } catch (e) { }
}
loadEnv('.env');
loadEnv('.env.local');

import { AccurateServerService } from './services/accurateServer';

async function run() {
    let output = "=== RAW API DIAGNOSTIC ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    // 1. Check branches
    output += "--- BRANCHES ---\n";
    const branches = await AccurateServerService.getBranches();
    output += `Total Branches: ${branches.length}\n`;
    for (const b of branches) {
        output += `  - ${b.name} (ID: ${b.id})\n`;
    }
    output += "\n";

    // 2. Test raw API call without any filter except owingStatus
    output += "--- RAW INVOICE COUNTS PER BRANCH ---\n";
    let grandTotal = 0;
    let grandOutstanding = 0;

    for (const branch of branches) {
        output += `\nBranch: ${branch.name} (ID: ${branch.id})\n`;

        let page = 1;
        let branchTotal = 0;
        let branchOutstanding = 0;
        let hasMore = true;

        while (hasMore && page <= 50) { // Max 50 pages per branch for safety
            const res = await AccurateServerService.fetchInvoices({
                owingStatus: 'UNPAID',
                page: page,
                limit: 100,
                branchId: String(branch.id)
            } as any);

            if (res.error) {
                output += `  Page ${page}: ERROR - ${res.error}\n`;
                hasMore = false;
                continue;
            }

            if (res.invoices && res.invoices.length > 0) {
                const pageOutstanding = res.invoices.reduce((sum: number, inv: any) => sum + inv.outstanding, 0);
                branchTotal += res.invoices.length;
                branchOutstanding += pageOutstanding;
                output += `  Page ${page}: ${res.invoices.length} invoices, Rp ${pageOutstanding.toLocaleString('id-ID')}\n`;

                if (res.invoices.length < 100) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                output += `  Page ${page}: 0 invoices\n`;
                hasMore = false;
            }

            // Rate limit delay
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        output += `  BRANCH TOTAL: ${branchTotal} invoices, Rp ${branchOutstanding.toLocaleString('id-ID')}\n`;
        grandTotal += branchTotal;
        grandOutstanding += branchOutstanding;
    }

    output += "\n--- GRAND TOTAL ---\n";
    output += `Total Invoices: ${grandTotal}\n`;
    output += `Total Outstanding: Rp ${grandOutstanding.toLocaleString('id-ID')}\n`;

    fs.writeFileSync('api_diagnostic.txt', output, 'utf8');
    console.log(output);
}

run();
