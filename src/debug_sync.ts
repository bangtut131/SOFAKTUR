
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
    console.log("=== DEBUG SYNC ===");

    // 1. Sync Customers (Quick Check)
    console.log("1. Testing fetchCustomers...");
    try {
        const custRes = await AccurateServerService.fetchCustomers(1);
        console.log(`   Fetched ${custRes.customers?.length} customers.`);
        if (custRes.customers?.length > 0) console.log(`   Sample: ${custRes.customers[0].name}`);
    } catch (e: any) {
        console.error("   Error fetching customers:", e.message);
    }

    // 2. Get Branches
    console.log("\n2. Testing getBranches...");
    let branches: any[] = [];
    try {
        branches = await AccurateServerService.getBranches();
        console.log(`   Fetched ${branches.length} branches:`, branches);
    } catch (e: any) {
        console.error("   Error fetching branches:", e.message);
    }

    // 3. Test Sync for Kantor Pusat
    const targetBranch = branches.find(b => b.id == 50 || b.name.includes("Pusat"));
    if (targetBranch) {
        console.log(`\n3. Testing Invoice Sync for ${targetBranch.name} (ID: ${targetBranch.id})...`);

        // Simulate Scheduler Date Logic (Current Month)
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
        const toDateStr = `${lastDay}/${String(curMonth + 1).padStart(2, '0')}/${curYear}`; // DD/MM/YYYY

        console.log(`   Using toDate: ${toDateStr} (fromDate ignored by logic)`);

        try {
            const res = await AccurateServerService.fetchInvoices({
                owingStatus: 'UNPAID',
                toDate: toDateStr,
                page: 1,
                limit: 20, // Low limit for test
                branchId: String(targetBranch.id)
            } as any);

            console.log(`   Result: Fetched ${res.invoices?.length} invoices.`);
            if (res.invoices && res.invoices.length > 0) {
                console.log(`   Sample Invoice: ${res.invoices[0].transNo} | ${res.invoices[0].amount}`);

                // Check if any is "NEW" (Feb 2026)
                const febInvoices = res.invoices.filter((i: any) => i.transDate.includes('/02/2026'));
                console.log(`   Invoices in Feb 2026: ${febInvoices.length}`);
            } else {
                console.log("   No invoices returned!");
                console.log("   Error info:", res.error);
            }
        } catch (e: any) {
            console.error("   Error fetching invoices:", e.message);
        }
    } else {
        console.log("\nSkipping Step 3: Kantor Pusat branch not found.");
    }
}

run();
