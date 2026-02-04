import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user || user.password !== password) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // Simple cookie session
        const cookieStore = await cookies();
        const oneDay = 24 * 60 * 60 * 1000;

        cookieStore.set('user_role', user.role, { path: '/', maxAge: oneDay });
        cookieStore.set('user_id', user.id, { path: '/', maxAge: oneDay });
        cookieStore.set('username', user.username, { path: '/', maxAge: oneDay });

        return NextResponse.json({ success: true, role: user.role });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
