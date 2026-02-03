const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getEnv(key) {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
        if (match) return match[1].trim().replace(/^"|"$/g, '');
    }
    return process.env[key];
}

const host = "https://zeus.accurate.id/accurate/api";
const token = getEnv("ACCURATE_API_TOKEN");
const dbId = getEnv("ACCURATE_DB_ID");
const secret = getEnv("ACCURATE_APP_SECRET") || '';

async function getYearCount(year) {
    const url = new URL(`${host}/sales-invoice/list.do`);
    url.searchParams.append('fields', 'id');
    url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
    url.searchParams.append('filter.primeOwing.val', '0');
    url.searchParams.append('filter.transDate.op', 'BETWEEN');
    url.searchParams.append('filter.transDate.val', `01/01/${year}`);
    url.searchParams.append('filter.transDate.val2', `31/12/${year}`);
    url.searchParams.append('sp.pageSize', '1');

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
    const data = await response.json();
    return data.sp?.totalCount || 0;
}

async function main() {
    console.log("--- Year-by-Year Census ---");
    for (let y = 2026; y >= 2015; y--) {
        const count = await getYearCount(y);
        console.log(`Year ${y}: ${count} invoices`);
    }
}
main();
