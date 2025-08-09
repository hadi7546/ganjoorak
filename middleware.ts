import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const host = request.headers.get('host')?.toLowerCase() || '';
    const isShortDomain = host === 'gnjk.ir' || host === 'www.gnjk.ir';

    // Redirect base path of the short domain to the main site
    if (isShortDomain && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '')) {
        return NextResponse.redirect('https://ganjoorak.ir');
    }

    return NextResponse.next();
}

// Only run this middleware on the root path (we only need to catch the base URL)
export const config = {
    matcher: ['/'],
};

