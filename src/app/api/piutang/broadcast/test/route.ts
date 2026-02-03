import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WahaService } from '@/services/waha';

export async function POST(req: Request) {
    try {
        const { customerId, targetPhone, template } = await req.json();

        if (!customerId || !targetPhone) {
            return NextResponse.json({ success: false, error: 'Customer ID and Target Phone are required' }, { status: 400 });
        }

        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                receivables: {
                    where: { status: 'OPEN', outstanding: { gt: 0 } }
                }
            }
        });

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
        }

        const totalOwing = customer.receivables.reduce((sum, inv) => sum + inv.outstanding, 0);
        const invoiceList = customer.receivables.map(r =>
            `- ${r.transNo}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(r.outstanding)}`
        ).join('\n');

        // Default template if nothing provided (though frontend usually provides it)
        const msgTemplate = template || "Halo {customerName}, Tagihan anda {totalOwing}. Detail:\n{invoiceList}";

        let message = msgTemplate
            .replace(/{customerName}/g, customer.name)
            .replace(/{totalOwing}/g, new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalOwing))
            .replace(/{invoiceList}/g, invoiceList);

        console.log(`[TEST BROADCAST] Sending to ${targetPhone} for customer ${customer.name}`);

        const result = await WahaService.sendText(targetPhone, message);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Test message sent successfully' });

    } catch (error: any) {
        console.error("Test Broadcast Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
