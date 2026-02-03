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

async function test(format) {
    console.log(`--- Testing Format: ${format} ---`);
    const dateVal = format === 'ID' ? '01/01/2000' : '2000-01-01';
    const url = new URL(`${host}/sales-invoice/list.do`);
    url.searchParams.append('fields', 'id,number,transDate,primeOwing');
    url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
    url.searchParams.append('filter.primeOwing.val', '0');
    url.searchParams.append('filter.transDate.op', 'GREATER_EQUAL_THAN');
    url.searchParams.append('filter.transDate.val', dateVal);
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
    const data = await response.json();
    console.log(`   Count: ${data.d?.length}, Total: ${data.sp?.totalCount}`);
    if (data.d && data.d.length > 0) console.log(`   Sample Date: ${data.d[0].transDate}`);
}

async function main() {
    await test('ID');
    await test('ISO');
}
main();
