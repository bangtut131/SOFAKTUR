import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import fs from 'fs';

async function testAlternativeEndpoints() {
    let output = "=== TESTING ALTERNATIVE API ENDPOINTS ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;
    const host = process.env.ACCURATE_API_HOST;
    const secret = process.env.ACCURATE_APP_SECRET;

    if (!token || !dbId || !host || !secret) {
        output += "ERROR: Missing env config\n";
        fs.writeFileSync('alt_endpoints.txt', output, 'utf8');
        return;
    }

    const makeRequest = async (endpoint: string, params: Record<string, string> = {}) => {
        const timestamp = new Date().toISOString();
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(timestamp);
        const signature = hmac.digest('base64');

        const url = new URL(`${host}/${endpoint}`);
        for (const [key, val] of Object.entries(params)) {
            url.searchParams.append(key, val);
        }

        output += `\n--- ${endpoint} ---\n`;
        output += `URL: ${url.toString()}\n`;

        try {
            const res = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Session-ID': dbId,
                    'X-Api-Timestamp': timestamp,
                    'X-Api-Signature': signature
                }
            });

            const data = await res.json();
            output += `Status: ${res.status}\n`;

            if (data.s === false) {
                output += `Error: ${data.m || 'Unknown'}\n`;
            } else {
                output += `TotalCount: ${data.sp?.totalCount || 'N/A'}\n`;
                if (data.d && data.d.length > 0) {
                    output += `Results: ${data.d.length}\n`;
                    // Show sample
                    const sample = data.d[0];
                    output += `Sample: ${JSON.stringify(sample, null, 2).substring(0, 500)}...\n`;
                }
            }
            return data;
        } catch (e: any) {
            output += `Exception: ${e.message}\n`;
            return null;
        }
    };

    // Test different endpoints
    await new Promise(r => setTimeout(r, 500));

    // 1. customer-invoice (for AR)
    await makeRequest('customer-invoice/list.do', {
        'fields': 'id,number,customer,totalAmount,outstanding,transDate',
        'sp.page': '1',
        'sp.pageSize': '10'
    });
    await new Promise(r => setTimeout(r, 1000));

    // 2. ar-invoice
    await makeRequest('ar-invoice/list.do', {
        'fields': 'id,number,customer,amount,outstanding,transDate',
        'sp.page': '1',
        'sp.pageSize': '10'
    });
    await new Promise(r => setTimeout(r, 1000));

    // 3. sales-invoice with different filter - removed suspended
    await makeRequest('sales-invoice/list.do', {
        'fields': 'id,number,customer,totalAmount,primeOwing,outstanding,transDate,branch',
        'filter.primeOwing.op': 'GREATER_THAN',
        'filter.primeOwing.val': '0',
        'sp.page': '1',
        'sp.pageSize': '100'
    });
    await new Promise(r => setTimeout(r, 1000));

    // 4. sales-invoice - search for Abadi Prima
    await makeRequest('sales-invoice/list.do', {
        'fields': 'id,number,customer,totalAmount,primeOwing,outstanding,transDate,branch',
        'filter.customer.name.op': 'LIKE',
        'filter.customer.name.val': 'Abadi Prima',
        'sp.page': '1',
        'sp.pageSize': '100'
    });
    await new Promise(r => setTimeout(r, 1000));

    // 5. customer list - search for Abadi Prima
    await makeRequest('customer/list.do', {
        'fields': 'id,name,mobilePhone,email',
        'filter.name.op': 'LIKE',
        'filter.name.val': 'Abadi Prima',
        'sp.page': '1',
        'sp.pageSize': '10'
    });

    fs.writeFileSync('alt_endpoints.txt', output, 'utf8');
    console.log("Written to alt_endpoints.txt");
    console.log(output);
}

testAlternativeEndpoints();
