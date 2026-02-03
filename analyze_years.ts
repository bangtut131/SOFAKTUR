import { AccurateServerService } from './src/services/accurateServer';
import * as fs from 'fs';
import * as path from 'path';

// Manual Env Loading
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

async function main() {
    console.log("--- Raw Data Inspection ---");
    const res = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        fromDate: '01/01/2000',
        toDate: '31/12/2099',
        page: 1,
        limit: 5
    } as any);

    if (res.error) {
        console.error("API Error:", res.error);
        return;
    }

    console.log("Total Count from API:", res.totalCount);
    console.log("Invoices Found (Page 1):", res.invoices?.length);
    if (res.invoices && res.invoices.length > 0) {
        console.log("Invoice 0:", JSON.stringify(res.invoices[0], null, 2));
    }
}
main();
