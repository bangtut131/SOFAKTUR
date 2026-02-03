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
    console.log("--- NTT Full Sum Test ---");
    const res = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        branchId: '350',
        fromDate: '01/01/2000',
        page: 1, limit: 100,
        sort: 'transDate|asc'
    } as any);

    console.log("Found:", res.invoices?.length);
    const sum = res.invoices?.reduce((acc: number, inv: any) => acc + (inv.outstanding || 0), 0);
    console.log("Sum of first 100:", sum);
}
main();
