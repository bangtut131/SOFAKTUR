import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await prisma.soSession.findUnique({
            where: { id: id },
            select: {
                id: true,
                periodName: true,
                status: true,
                createdAt: true,
                items: {
                    orderBy: { customerName: 'asc' },
                    select: {
                        id: true,
                        transNo: true,
                        transDate: true,
                        customerName: true,
                        amount: true,
                        primeOwing: true,
                        description: true,
                        statusName: true,
                        approvalStatus: true,
                        status: true,
                        existenceStatus: true,
                        remarks: true,
                        scannedAt: true,
                        // Exclude heavy fields if any future additions
                    }
                }
            }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Get Role Config
        const cookieStore = await cookies();
        const role = cookieStore.get('user_role')?.value || 'STAFF';
        const roleConfig = await prisma.roleConfig.findUnique({
            where: { role }
        });

        // Default to all allowed if no config found
        const visibleColumns = roleConfig ? JSON.parse(roleConfig.visibleColumns) : [];

        return NextResponse.json({ session, visibleColumns, userRole: role });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        await prisma.soSession.delete({
            where: { id: id }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
