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

import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Testing Monthly Fetch (Feb 2026) NTT ---");
    // Branch 350 is NTT
    const res = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        // fromDate: '01/02/2026',
        toDate: '28/02/2026',
        page: 1, limit: 10,
        branchId: '350'
    } as any);

    console.log("Result:", res.invoices?.length, "Total:", res.totalCount);
    if (res.invoices && res.invoices.length > 0) {
        console.log("Sample Invoice:", res.invoices[0].number);
    } else {
        console.log("No invoices found.");
    }
}
main();
