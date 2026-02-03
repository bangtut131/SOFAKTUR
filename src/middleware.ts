import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Simple cookie check
    const hasUser = request.cookies.has('user_role');
    const path = request.nextUrl.pathname;

    // Public paths
    if (path === '/login' || path === '/' || path.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Protected paths
    if ((path.startsWith('/dashboard') || path.startsWith('/so')) && !hasUser) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role based protection (Basic)
    const role = request.cookies.get('user_role')?.value;

    // Finance Approval Page -> Finance/Admin only
    if (path.startsWith('/so/approval') && role !== 'FINANCE' && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/so/:path*', '/login'],
}
