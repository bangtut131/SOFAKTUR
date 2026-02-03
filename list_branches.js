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

async function test() {
    const url = new URL(`${host}/branch/list.do`);
    url.searchParams.append('fields', 'id,name');

    const timestamp = new Date().toISOString();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Session-ID': dbId, 'X-Api-Timestamp': timestamp, 'X-Api-Signature': signature },
    });
    const data = await response.json();
    console.log("BRANCHES:", JSON.stringify(data.d, null, 2));
}
test();
