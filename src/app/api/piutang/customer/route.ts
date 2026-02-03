import { NextResponse } from 'next/server';
import { AccurateServerService } from '@/services/accurateServer';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
        return NextResponse.json({ error: 'customerId required' }, { status: 400 });
    }

    try {
        // Get customer detail from Accurate
        const customer = await AccurateServerService.getCustomerDetail(customerId);

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: customer.id,
            name: customer.name,
            phone: customer.mobilePhone || customer.phone || null,
            email: customer.email || null
        });

    } catch (error: any) {
        console.error("Get Customer Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
