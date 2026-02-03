import crypto from 'crypto';
import fetch from 'node-fetch';
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

const host = "https://zeus.accurate.id/accurate/api";
const token = process.env.ACCURATE_API_TOKEN;
const dbId = process.env.ACCURATE_DB_ID;
const secret = process.env.ACCURATE_APP_SECRET || '';

async function test() {
    // MINIMAL FIELDS
    const url = new URL(`${host}/sales-invoice/list.do`);
    url.searchParams.append('fields', 'id,number,transDate,outstanding,primeOwing');

    url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
    url.searchParams.append('filter.primeOwing.val', '0');

    url.searchParams.append('filter.transDate.op', 'GREATER_EQUAL_THAN');
    url.searchParams.append('filter.transDate.val', '01/01/2000');

    url.searchParams.append('sp.page', '1');
    url.searchParams.append('sp.pageSize', '10');

    const timestamp = new Date().toISOString();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-Session-ID': dbId,
            'X-Api-Timestamp': timestamp,
            'X-Api-Signature': signature
        },
    });
    const data: any = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
}
test();
