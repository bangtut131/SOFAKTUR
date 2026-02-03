import crypto from 'crypto';
import fetch from 'node-fetch';

const host = "https://zeus.accurate.id/accurate/api";
const token = "aat.MjAw.eyJ2IjoxLCJ1Ijo2Mjc0MDksImQiOjQ1Mzc3MiwiYWkiOjYyNjAwLCJhayI6ImYzNDA2YWNiLWFkNTMtNGMyNC05MjZjLTg2OGFhNDU0MGU2MSIsImFuIjoiT3RvbWFzaSBQcm9qZWN0IDIiLCJhcCI6IjM4YThmYjIzLTIzYWQtNDQxZC1iZjY0LWM1Nzk1ZjBlMTA1YyIsInQiOjE3NjgwNjY2MTM2NzN9.O7BIltqR7s8VrAN2l1FsoJxcpfNXqqHRk6II927tnVhEd6vIhEpd2DrBpd5waBfgQfoly499G3UU/MsDaCmOGNETNp7VQoy/DM9wkJtivA/jOfd3YJX12YAjrCa6Nr9/4cAWy7F6bcKiffashlGwvV6hxKlyqh9lNzit3c0yLDfr3GXrzH4TsLROCsk4YLfY66pANP8/nOI=.XuaH5GaabcP10w4RmvCwDVGk12XuP8eyA+AK5j0b2j0";
const dbId = "453772";
const secret = "FZmbrXYS7VHrkjLPOpbJydHWR1bnIzOkEjcjAMiADcbI2xYm2pkYp2NIWUJXLOVD";

async function test(page: number) {
    const url = new URL(`${host}/sales-invoice/list.do`);
    url.searchParams.append('fields', 'id,number,transDate,primeOwing,outstanding');

    // Unpaid filter
    url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
    url.searchParams.append('filter.primeOwing.val', '0');

    // Date filter: GREATER_EQUAL_THAN 2000
    url.searchParams.append('filter.transDate.op', 'GREATER_EQUAL_THAN');
    url.searchParams.append('filter.transDate.val', '01/01/2000');

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
    console.log(`Page ${page}: length=${data.d?.length}, totalCount=${data.sp?.totalCount}`);
    if (data.d && data.d.length > 0) {
        console.log(`   Sample Date: ${data.d[0].transDate}`);
    }
}

async function main() {
    console.log("--- Diagnostic: Filter Persistence ---");
    await test(1);
    await test(2);
}
main();
