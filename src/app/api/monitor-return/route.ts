import { NextResponse } from 'next/server';
import { AccurateServerService } from '@/services/accurateServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { filters } = body;

        // Force filter to RETURN
        const forcedFilters = {
            ...filters,
            owingStatus: 'RETURN'
        };

        // Fetch ALL data from Accurate (Looping Pages) for monitoring
        let allInvoices: any[] = [];
        let page = 1;
        let hasMore = true;
        const LIMIT = '100';
        const MAX_PAGES = 50; // Max 5000 records

        while (hasMore && page <= MAX_PAGES) {
            const result = await AccurateServerService.fetchInvoices({
                ...forcedFilters,
                page: page.toString(),
                limit: LIMIT
            });

            if (result.error) {
                return NextResponse.json({ error: `Accurate API Error on page ${page}: ${result.error}` }, { status: 500 });
            }

            const pageData = result.invoices;
            allInvoices = [...allInvoices, ...pageData];

            if ((result.rawCount || 0) < parseInt(LIMIT)) {
                hasMore = false;
            } else {
                page++;
            }
        }

        return NextResponse.json({
            success: true,
            invoices: allInvoices,
            count: allInvoices.length
        });
    } catch (error: any) {
        console.error("Monitor Return API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
