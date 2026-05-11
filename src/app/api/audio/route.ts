import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set([
    'api.ganjoor.net',
    'bayanbox.ir',
    'ganjgah.ir',
    'ganjoor.net',
    'i.ganjoor.net',
    'offline.ganjoor.net',
    'api.offline.ganjoor.net',
]);

const isAllowedAudioUrl = (url: URL) => {
    const hostname = url.hostname.toLowerCase();

    if (ALLOWED_HOSTS.has(hostname)) {
        return true;
    }

    return (
        hostname.endsWith('.ganjoor.net') ||
        hostname.endsWith('.offline.ganjoor.net') ||
        hostname.endsWith('.bayanbox.ir') ||
        hostname.endsWith('.ganjgah.ir')
    );
};

export async function GET(request: NextRequest) {
    const sourceUrl = request.nextUrl.searchParams.get('url');

    if (!sourceUrl) {
        return new Response('URL parameter is required', { status: 400 });
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(sourceUrl);
    } catch {
        return new Response('Invalid audio URL', { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return new Response('Unsupported audio URL', { status: 400 });
    }

    if (!isAllowedAudioUrl(parsedUrl)) {
        return new Response('Invalid URL domain', { status: 403 });
    }

    return NextResponse.redirect(parsedUrl.toString(), 302);
}
