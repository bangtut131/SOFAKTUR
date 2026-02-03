import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import fs from 'fs';

async function searchAbadiPrima() {
    let output = "=== SEARCH ALL INVOICES FOR ABADI PRIMA ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;
    const host = process.env.ACCURATE_API_HOST;
    const secret = process.env.ACCURATE_APP_SECRET;

    if (!token || !dbId || !host || !secret) {
        output += "ERROR: Missing env config\n";
        fs.writeFileSync('search_abadi.txt', output, 'utf8');
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

    // Search all invoices (no primeOwing filter) and find Abadi Prima
    output += "--- Searching without primeOwing filter ---\n";

    let found: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 100) {
        const url = new URL(`${host}/sales-invoice/list.do`);
        url.searchParams.append('fields', 'id,number,customer,totalAmount,primeOwing,outstanding,transDate,dueDate');
        url.searchParams.append('sp.page', String(page));
        url.searchParams.append('sp.pageSize', '100');

        const data = await makeRequest(url.toString());

        if (data.d && data.d.length > 0) {
            for (const inv of data.d) {
                if (inv.customer?.name?.toLowerCase().includes('abadi prima')) {
                    found.push({
                        number: inv.number,
                        customer: inv.customer.name,
                        primeOwing: inv.primeOwing,
                        outstanding: inv.outstanding,
                        transDate: inv.transDate
                    });
                }
            }

            if (found.length > 0) {
                output += `Page ${page}: Found ${found.length} total matches\n`;
            }

            if (data.d.length < 100) {
                hasMore = false;
            } else {
                page++;
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            hasMore = false;
        }

        if (page % 10 === 0) {
            output += `Searched ${page} pages...\n`;
        }
    }

    output += `\n=== RESULTS ===\n`;
    output += `Total pages searched: ${page}\n`;
    output += `Abadi Prima invoices found: ${found.length}\n\n`;

    if (found.length > 0) {
        let totalPrimeOwing = 0;
        for (const inv of found) {
            output += `${inv.number}: ${inv.customer}\n`;
            output += `  PrimeOwing: Rp ${(inv.primeOwing || 0).toLocaleString('id-ID')}\n`;
            output += `  Outstanding: Rp ${(inv.outstanding || 0).toLocaleString('id-ID')}\n`;
            output += `  Date: ${inv.transDate}\n\n`;
            totalPrimeOwing += inv.primeOwing || 0;
        }
        output += `Total PrimeOwing for Abadi Prima: Rp ${totalPrimeOwing.toLocaleString('id-ID')}\n`;
    }

    fs.writeFileSync('search_abadi.txt', output, 'utf8');
    console.log("Written to search_abadi.txt");
    console.log(output);
}

searchAbadiPrima();
