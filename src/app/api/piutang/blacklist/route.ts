import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

function getUsername(): string {
    try {
        const cookieStore = cookies();
        return cookieStore.get('username')?.value || 'system';
    } catch {
        return 'system';
    }
}

// GET /api/piutang/blacklist
// Returns all blacklist entries (with history)
// Add ?customers=true to get customer list for dropdown
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('activeOnly') !== 'false';
        const wantCustomers = searchParams.get('customers') === 'true';

        // Return customer list for dropdown
        if (wantCustomers) {
            const customers = await prisma.customer.findMany({
                select: { id: true, name: true, phone: true },
                orderBy: { name: 'asc' }
            });
            return NextResponse.json({ customers });
        }

        const entries = await prisma.piutangBlacklist.findMany({
            where: activeOnly ? { status: 'ACTIVE' } : undefined,
            include: {
                customer: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Also get set of active blacklisted customer IDs for quick lookup
        const activeIds = entries
            .filter(e => e.status === 'ACTIVE')
            .map(e => e.customerId);

        return NextResponse.json({ entries, activeIds });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/piutang/blacklist
// Blacklist a customer
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, reason } = body;

        if (!customerId) {
            return NextResponse.json({ error: 'customerId diperlukan' }, { status: 400 });
        }

        // Check if already actively blacklisted
        const existing = await prisma.piutangBlacklist.findFirst({
            where: { customerId, status: 'ACTIVE' }
        });

        if (existing) {
            return NextResponse.json({ error: 'Customer sudah ada di blacklist' }, { status: 409 });
        }

        const username = getUsername();

        const entry = await prisma.piutangBlacklist.create({
            data: {
                customerId,
                reason: reason || null,
                status: 'ACTIVE',
                addedBy: username,
            },
            include: {
                customer: { select: { id: true, name: true, phone: true } }
            }
        });

        return NextResponse.json({ success: true, entry });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
