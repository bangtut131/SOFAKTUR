import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import fs from 'fs';

async function countAllUnpaid() {
    let output = "=== COUNT ALL UNPAID (NO BRANCH FILTER) ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;
    const host = process.env.ACCURATE_API_HOST;
    const secret = process.env.ACCURATE_APP_SECRET;

    if (!token || !dbId || !host || !secret) {
        output += "ERROR: Missing env config\n";
        fs.writeFileSync('count_all_unpaid.txt', output, 'utf8');
        return;
    }

    const timestamp = new Date().toISOString();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    let page = 1;
    let totalInvoices = 0;
    let totalAmount = 0;
    let hasMore = true;
    let abadiPrimaFound: any[] = [];

    while (hasMore) {
        const url = new URL(`${host}/sales-invoice/list.do`);
        url.searchParams.append('fields', 'id,number,customer,totalAmount,primeOwing,transDate,branch');
        url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
        url.searchParams.append('filter.primeOwing.val', '0');
        url.searchParams.append('sp.page', String(page));
        url.searchParams.append('sp.pageSize', '100');

        try {
            const res = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Session-ID': dbId,
                    'X-Api-Timestamp': timestamp,
                    'X-Api-Signature': signature
                }
            });

            if (res.status === 429) {
                output += `[Page ${page}] Rate limited, waiting 3s...\n`;
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }

            const data = await res.json();

            if (data.d && data.d.length > 0) {
                const pageAmount = data.d.reduce((sum: number, inv: any) => sum + (inv.primeOwing || 0), 0);
                totalInvoices += data.d.length;
                totalAmount += pageAmount;

                output += `Page ${page}: ${data.d.length} invoices, Rp ${pageAmount.toLocaleString('id-ID')}\n`;

                // Check for Abadi Prima
                for (const inv of data.d) {
                    if (inv.customer?.name?.toLowerCase().includes('abadi prima')) {
                        abadiPrimaFound.push({
                            number: inv.number,
                            customer: inv.customer.name,
                            amount: inv.primeOwing,
                            branch: inv.branch?.name
                        });
                    }
                }

                if (data.d.length < 100) {
                    hasMore = false;
                } else {
                    page++;
                    await new Promise(r => setTimeout(r, 1500)); // Rate limit delay
                }
            } else {
                hasMore = false;
            }
        } catch (e: any) {
            output += `Page ${page} ERROR: ${e.message}\n`;
            hasMore = false;
        }
    }

    output += `\n=== SUMMARY ===\n`;
    output += `Total Pages: ${page}\n`;
    output += `Total Invoices: ${totalInvoices}\n`;
    output += `Total Outstanding: Rp ${totalAmount.toLocaleString('id-ID')}\n`;

    if (abadiPrimaFound.length > 0) {
        output += `\n=== CV ABADI PRIMA FOUND ===\n`;
        for (const inv of abadiPrimaFound) {
            output += `  ${inv.number}: ${inv.customer} - Rp ${inv.amount.toLocaleString('id-ID')} (${inv.branch})\n`;
        }
    } else {
        output += `\nCV Abadi Prima: NOT FOUND in unpaid invoices\n`;
    }

    fs.writeFileSync('count_all_unpaid.txt', output, 'utf8');
    console.log("Written to count_all_unpaid.txt");
    console.log(output);
}

countAllUnpaid();
