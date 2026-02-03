import { prisma } from './src/lib/prisma';
import crypto from 'crypto';
import fetch from 'node-fetch';

async function testFilter(page: number, op: string, val: string, val2?: string) {
    const host = process.env.ACCURATE_API_HOST;
    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;
    const secret = process.env.ACCURATE_APP_SECRET || '';

    const url = new URL(`${host}/sales-invoice/list.do`);
    url.searchParams.append('fields', 'id,number,customer,totalAmount,primeOwing,outstanding,transDate,dueDate,description,statusName,approvalStatus');
    url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
    url.searchParams.append('filter.primeOwing.val', '0');

    url.searchParams.append('filter.transDate.op', op);
    url.searchParams.append('filter.transDate.val', val);
    if (val2) url.searchParams.append('filter.transDate.val2', val2);

    url.searchParams.append('sp.page', String(page));
    url.searchParams.append('sp.pageSize', '100');

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
    console.log(`P${page} (${op} ${val}): count=${data.d?.length}, total=${data.sp?.totalCount}`);
}

async function main() {
    console.log("--- Testing GREATER_EQUAL_THAN Pagination ---");
    await testFilter(1, 'GREATER_EQUAL_THAN', '01/01/2000');
    await testFilter(2, 'GREATER_EQUAL_THAN', '01/01/2000');

    console.log("\n--- Testing BETWEEN Pagination ---");
    await testFilter(1, 'BETWEEN', '01/01/2000', '31/12/2099');
    await testFilter(2, 'BETWEEN', '01/01/2000', '31/12/2099');
}
main();
