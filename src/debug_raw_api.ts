import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import fs from 'fs';

async function testRawAPI() {
    let output = "=== RAW API TEST (NO FILTERS) ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;
    const host = process.env.ACCURATE_API_HOST;
    const secret = process.env.ACCURATE_APP_SECRET;

    if (!token || !dbId || !host || !secret) {
        output += "ERROR: Missing env config\n";
        fs.writeFileSync('raw_api_test.txt', output, 'utf8');
        return;
    }

    const generateSignature = (token: string, secret: string) => {
        return crypto.createHmac('sha256', secret).update(token).digest('hex');
    };

    const signature = generateSignature(token, secret);

    // Test 1: List all invoices WITHOUT primeOwing filter
    output += "--- TEST 1: No primeOwing filter ---\n";
    try {
        const url = new URL(`${host}/sales-invoice/list.do`);
        url.searchParams.append('fields', 'id,number,customer,totalAmount,primeOwing,outstanding,transDate');
        url.searchParams.append('sp.page', '1');
        url.searchParams.append('sp.pageSize', '100');

        output += `URL: ${url.toString()}\n`;

        const res = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Api-Timestamp': Date.now().toString(),
                'X-Api-Signature': signature,
                'X-SESSION-ID': dbId
            }
        });

        const data = await res.json();
        output += `Status: ${res.status}\n`;
        output += `Total Count: ${data.sp?.totalCount || 'N/A'}\n`;

        if (data.d && data.d.length > 0) {
            output += `Page 1 Results: ${data.d.length} invoices\n`;

            // Sum outstanding
            let pageTotal = 0;
            for (const inv of data.d) {
                pageTotal += (inv.primeOwing || 0);
            }
            output += `Page 1 primeOwing Sum: Rp ${pageTotal.toLocaleString('id-ID')}\n`;

            // Show first 5
            output += "\nFirst 5 invoices:\n";
            for (let i = 0; i < Math.min(5, data.d.length); i++) {
                const inv = data.d[i];
                output += `  ${inv.number}: ${inv.customer?.name || 'N/A'} - PrimeOwing: Rp ${(inv.primeOwing || 0).toLocaleString('id-ID')}\n`;
            }
        }
    } catch (e: any) {
        output += `ERROR: ${e.message}\n`;
    }

    // Test 2: Search for CV Abadi Prima specifically
    output += "\n--- TEST 2: Search for CV Abadi Prima ---\n";
    try {
        const url = new URL(`${host}/sales-invoice/list.do`);
        url.searchParams.append('fields', 'id,number,customer,totalAmount,primeOwing,outstanding,transDate');
        url.searchParams.append('filter.keywords', 'Abadi Prima');
        url.searchParams.append('sp.page', '1');
        url.searchParams.append('sp.pageSize', '100');

        output += `URL: ${url.toString()}\n`;

        const res = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Api-Timestamp': Date.now().toString(),
                'X-Api-Signature': signature,
                'X-SESSION-ID': dbId
            }
        });

        const data = await res.json();
        output += `Status: ${res.status}\n`;
        output += `Total Count: ${data.sp?.totalCount || 'N/A'}\n`;

        if (data.d && data.d.length > 0) {
            output += `Results: ${data.d.length} invoices\n\n`;

            let abTotal = 0;
            for (const inv of data.d) {
                abTotal += (inv.primeOwing || 0);
                output += `  ${inv.number}: ${inv.customer?.name || 'N/A'} - PrimeOwing: Rp ${(inv.primeOwing || 0).toLocaleString('id-ID')}\n`;
            }
            output += `\nTotal for Abadi Prima: Rp ${abTotal.toLocaleString('id-ID')}\n`;
        } else {
            output += "No results found\n";
        }
    } catch (e: any) {
        output += `ERROR: ${e.message}\n`;
    }

    // Test 3: Get total count without filters (pagination info)
    output += "\n--- TEST 3: Get TOTAL invoice count (all) ---\n";
    try {
        const url = new URL(`${host}/sales-invoice/list.do`);
        url.searchParams.append('fields', 'id');
        url.searchParams.append('sp.page', '1');
        url.searchParams.append('sp.pageSize', '1');

        const res = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Api-Timestamp': Date.now().toString(),
                'X-Api-Signature': signature,
                'X-SESSION-ID': dbId
            }
        });

        const data = await res.json();
        output += `Total Invoices in Accurate: ${data.sp?.totalCount || 'N/A'}\n`;
    } catch (e: any) {
        output += `ERROR: ${e.message}\n`;
    }

    // Test 4: Get total with primeOwing > 0
    output += "\n--- TEST 4: Total count with primeOwing > 0 ---\n";
    try {
        const url = new URL(`${host}/sales-invoice/list.do`);
        url.searchParams.append('fields', 'id');
        url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
        url.searchParams.append('filter.primeOwing.val', '0');
        url.searchParams.append('sp.page', '1');
        url.searchParams.append('sp.pageSize', '1');

        const res = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Api-Timestamp': Date.now().toString(),
                'X-Api-Signature': signature,
                'X-SESSION-ID': dbId
            }
        });

        const data = await res.json();
        output += `Invoices with primeOwing > 0: ${data.sp?.totalCount || 'N/A'}\n`;
    } catch (e: any) {
        output += `ERROR: ${e.message}\n`;
    }

    fs.writeFileSync('raw_api_test.txt', output, 'utf8');
    console.log("Written to raw_api_test.txt");
    console.log(output);
}

testRawAPI();
