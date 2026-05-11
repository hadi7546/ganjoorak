import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === 'bayanbox.ir' || hostname.endsWith('.bayanbox.ir')) {
        return NextResponse.redirect(parsedUrl.toString(), 307);
    }

    try {
        const upstreamHeaders = new Headers();
        const range = request.headers.get('range');
        const ifRange = request.headers.get('if-range');

        if (range) {
            upstreamHeaders.set('Range', range);
        }

        if (ifRange) {
            upstreamHeaders.set('If-Range', ifRange);
        }

        upstreamHeaders.set('Accept', request.headers.get('accept') || 'audio/mpeg,*/*');
        upstreamHeaders.set('User-Agent', 'Mozilla/5.0 (compatible; GanjoorakAudioProxy/1.0)');

        const response = await fetch(parsedUrl, {
            headers: upstreamHeaders,
            cache: 'no-store',
            redirect: 'follow',
        });

        const headers = new Headers();
        const passthroughHeaders = [
            'accept-ranges',
            'cache-control',
            'content-length',
            'content-range',
            'content-type',
            'etag',
            'last-modified',
        ];

        passthroughHeaders.forEach((header) => {
            const value = response.headers.get(header);
            if (value) {
                headers.set(header, value);
            }
        });

        if (!headers.has('content-type')) {
            headers.set('content-type', 'audio/mpeg');
        }

        headers.set('Cache-Control', headers.get('cache-control') || 'no-store');

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    } catch (error) {
        console.error('Error proxying audio file:', error);
        if (parsedUrl.protocol === 'https:') {
            return NextResponse.redirect(parsedUrl.toString(), 307);
        }

        return new Response('Failed to load audio', { status: 502 });
    }
}
