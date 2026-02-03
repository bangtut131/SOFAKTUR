import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// UPDATE User (Password/Role)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { password, role } = await request.json();
        const data: any = {};
        if (password) data.password = password;
        if (role) data.role = role;

        const user = await prisma.user.update({
            where: { id: params.id },
            data
        });

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE User
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.user.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
