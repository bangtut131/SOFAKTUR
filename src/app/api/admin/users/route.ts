import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all users
export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, createdAt: true }
        });
        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CREATE new user
export async function POST(request: Request) {
    try {
        const { username, password, role } = await request.json();

        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 400 });

        const user = await prisma.user.create({
            data: { username, password, role }
        });

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
