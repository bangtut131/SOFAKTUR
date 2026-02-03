import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccurateServerService } from '@/services/accurateServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { filters, periodName } = body;

        if (!periodName) {
            return NextResponse.json({ error: 'Period Name is required' }, { status: 400 });
        }

        // 1. Fetch ALL data from Accurate (Looping Pages)
        let allInvoices: any[] = [];
        let page = 1;
        let hasMore = true;
        const LIMIT = '100';

        // Safety limit to prevent infinite loops
        const MAX_PAGES = 50;

        while (hasMore && page <= MAX_PAGES) {
            const result = await AccurateServerService.fetchInvoices({
                ...filters,
                page: page.toString(),
                limit: LIMIT
            });

            if (result.error) {
                return NextResponse.json({ error: `Accurate API Error on page ${page}: ${result.error}` }, { status: 500 });
            }

            const pageData = result.invoices;
            allInvoices = [...allInvoices, ...pageData];

            // Check RAW count from API to decide if there is more data
            // If API returned 100 items (LIMIT), there might be more, even if we filtered some out in JS.
            if ((result.rawCount || 0) < parseInt(LIMIT)) {
                hasMore = false;
            } else {
                page++;
            }
        }

        if (allInvoices.length === 0) {
            return NextResponse.json({ error: 'No data found from Accurate with provided filters' }, { status: 404 });
        }

        // 2. Save to Database
        const totalValue = allInvoices.reduce((sum, item) => sum + item.primeOwing, 0);

        const session = await prisma.soSession.create({
            data: {
                periodName,
                status: 'OPEN',
                totalItems: allInvoices.length,
                totalValue: totalValue,
                items: {
                    create: allInvoices.map(inv => ({
                        transNo: inv.transNo,
                        transDate: inv.transDate,
                        dueDate: inv.dueDate,
                        customerName: inv.customerName,
                        description: inv.description,
                        statusName: inv.statusName,
                        approvalStatus: inv.approvalStatus,
                        amount: inv.amount,
                        outstanding: inv.outstanding,
                        primeOwing: inv.primeOwing,
                        // Defaults
                        status: 'UNVERIFIED'
                    }))
                }
            }
        });

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            count: allInvoices.length
        });

    } catch (error: any) {
        console.error("Release SO Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
