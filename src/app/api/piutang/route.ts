import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch Stats based on persisted data
        const rawReceivables = await prisma.receivable.findMany({
            where: { status: 'OPEN', outstanding: { gt: 100 } },
            include: { customer: true },
            orderBy: { outstanding: 'desc' }
        });

        // Get last update time
        const lastUpdateRec = await prisma.receivable.findFirst({
            orderBy: { lastSyncedAt: 'desc' },
            select: { lastSyncedAt: true }
        });
        const lastUpdate = lastUpdateRec?.lastSyncedAt || null;

        const totalOutstanding = rawReceivables.reduce((sum, r) => sum + r.outstanding, 0);
        const uniqueCustIds = new Set(rawReceivables.map(r => r.customerId));

        // Group
        const custMap = new Map<string, any>();
        for (const r of rawReceivables) {
            if (!custMap.has(r.customerId)) {
                custMap.set(r.customerId, {
                    id: r.customer.id,
                    accurateId: r.customer.accurateId,
                    name: r.customer.name,
                    phone: r.customer.phone,
                    invoiceCount: 0,
                    totalOwing: 0,
                    invoices: []
                });
            }
            const c = custMap.get(r.customerId);
            // c.invoiceCount++ removed
            c.totalOwing += r.outstanding;
            c.invoices.push({
                transNo: r.transNo,
                transDate: r.transDate.toLocaleDateString('id-ID'),
                dueDate: r.dueDate.toLocaleDateString('id-ID'),
                amount: r.amount,
                outstanding: r.outstanding
            });
        }

        // Set invoiceCount explicitly
        for (const c of custMap.values()) {
            c.invoiceCount = c.invoices.length;
        }

        const customers = Array.from(custMap.values()).sort((a, b) => b.totalOwing - a.totalOwing);

        return NextResponse.json({
            success: true,
            lastUpdate,
            stats: {
                totalCustomers: uniqueCustIds.size,
                totalInvoices: rawReceivables.length,
                totalOutstanding
            },
            customers
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
