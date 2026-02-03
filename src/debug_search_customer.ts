import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import fs from 'fs';

async function searchCustomer() {
    let output = "=== SEARCH CUSTOMER FOR ABADI PRIMA ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;
    const host = process.env.ACCURATE_API_HOST;
    const secret = process.env.ACCURATE_APP_SECRET;

    if (!token || !dbId || !host || !secret) {
        output += "ERROR: Missing env config\n";
        fs.writeFileSync('search_customer.txt', output, 'utf8');
        return;
    }

    const makeRequest = async (url: string) => {
        const timestamp = new Date().toISOString();
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(timestamp);
        const signature = hmac.digest('base64');

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Session-ID': dbId,
                'X-Api-Timestamp': timestamp,
                'X-Api-Signature': signature
            }
        });
        return res.json();
    };

    // Search for customers containing "abadi"
    output += "--- Searching customers with 'abadi' in name ---\n";

    let page = 1;
    let found: any[] = [];
    let hasMore = true;

    while (hasMore && page <= 50) {
        const url = new URL(`${host}/customer/list.do`);
        url.searchParams.append('fields', 'id,name,customerNo,mobilePhone,phone');
        url.searchParams.append('sp.page', String(page));
        url.searchParams.append('sp.pageSize', '100');

        const data = await makeRequest(url.toString());

        if (data.d && data.d.length > 0) {
            for (const cust of data.d) {
                if (cust.name?.toLowerCase().includes('abadi')) {
                    found.push(cust);
                }
            }

            if (data.d.length < 100) {
                hasMore = false;
            } else {
                page++;
                await new Promise(r => setTimeout(r, 300));
            }
        } else {
            hasMore = false;
        }
    }

    output += `\nTotal customers searched: ${page * 100} (approx)\n`;
    output += `Customers with 'abadi' in name: ${found.length}\n\n`;

    for (const c of found) {
        output += `ID: ${c.id}\n`;
        output += `  Name: ${c.name}\n`;
        output += `  Code: ${c.customerNo}\n`;
        output += `  Phone: ${c.mobilePhone || c.phone || 'N/A'}\n\n`;
    }

    // Also check overall customer count
    output += "--- Overall Customer Count ---\n";
    const countUrl = new URL(`${host}/customer/list.do`);
    countUrl.searchParams.append('fields', 'id');
    countUrl.searchParams.append('sp.page', '1');
    countUrl.searchParams.append('sp.pageSize', '1');
    const countData = await makeRequest(countUrl.toString());
    output += `Total customers: ${countData.sp?.totalCount || 'N/A'}\n`;

    fs.writeFileSync('search_customer.txt', output, 'utf8');
    console.log("Written to search_customer.txt");
    console.log(output);
}

searchCustomer();
