import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;
    const host = process.env.ACCURATE_API_HOST;
    const secret = process.env.ACCURATE_APP_SECRET;

    if (!token || !dbId || !host || !secret) {
        return NextResponse.json({ error: 'Config Error' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '100';

    // Filters
    const owingStatus = searchParams.get('owingStatus'); // 'UNPAID', 'PAID', 'ALL'
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const accurateStatus = searchParams.get('accurateStatus');

    console.log("API Filter Request:", { owingStatus, fromDate, toDate });

    const url = new URL(`${host}/sales-invoice/list.do`);

    url.searchParams.append('fields', 'id,number,customer,totalAmount,primeOwing,outstanding,transDate,dueDate,description,statusName,approvalStatus');

    // 1. Payment Status Filter (API Level)
    if (owingStatus === 'PAID') {
        url.searchParams.append('filter.primeOwing.op', 'EQUAL');
        url.searchParams.append('filter.primeOwing.val', '0');
    } else if (owingStatus === 'ALL') {
        // No filter
    } else {
        // Default to UNPAID
        url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
        url.searchParams.append('filter.primeOwing.val', '0');
    }

    // 2. Date Range Filter
    if (fromDate && toDate) {
        const formatDate = (d: string) => {
            if (!d.includes('-')) return d;
            const [y, m, dIn] = d.split('-');
            return `${dIn}/${m}/${y}`;
        };
        const fStart = formatDate(fromDate);
        const fEnd = formatDate(toDate);
        url.searchParams.append('filter.transDate.op', 'BETWEEN');
        url.searchParams.append('filter.transDate.val', fStart);
        url.searchParams.append('filter.transDate.val2', fEnd);
    }

    // 3. Accurate Status Filter
    if (accurateStatus) {
        url.searchParams.append('filter.statusName.op', 'CONTAIN');
        url.searchParams.append('filter.statusName.val', accurateStatus);
    }

    const branchName = searchParams.get('branchName');
    if (branchName) {
        url.searchParams.append('filter.branch.name.op', 'CONTAIN');
        url.searchParams.append('filter.branch.name.val', branchName);
    }

    // Pagination
    url.searchParams.append('sp.page', page);
    url.searchParams.append('sp.pageSize', limit);
    url.searchParams.append('sp.sort', 'transDate|desc');

    try {
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

        if (!response.ok) {
            const txt = await response.text();
            return NextResponse.json({ error: 'Accurate Error', details: txt }, { status: response.status });
        }

        const data = await response.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let invoices = (data.d || [])
            .filter((item: any) => item && (item.id || item.number))
            .map((item: any) => ({
                id: item.id ? String(item.id) : `TEMP-${Math.random()}`,
                transDate: item.transDate || '',
                transNo: item.number || 'NO-NO',
                customerName: item.customer?.name || 'Unknown',
                amount: typeof item.totalAmount === 'number' ? item.totalAmount : 0,
                outstanding: typeof item.outstanding === 'number' ? item.outstanding : 0,
                primeOwing: typeof item.primeOwing === 'number' ? item.primeOwing : 0,
                status: 'UNVERIFIED',
                dueDate: item.dueDate || '',
                description: item.description || '',
                statusName: item.statusName || '',
                approvalStatus: item.approvalStatus || ''
            }));

        // Safety Filter (JS Level)
        if (owingStatus === 'PAID') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            invoices = invoices.filter((i: any) => i.primeOwing === 0);
        } else if (owingStatus === 'UNPAID' || !owingStatus) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            invoices = invoices.filter((i: any) => i.primeOwing > 0);
        }

        return NextResponse.json(invoices);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
