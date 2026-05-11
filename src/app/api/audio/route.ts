import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const AUDIO_RESPONSE_HEADERS = [
    'accept-ranges',
    'cache-control',
    'content-disposition',
    'content-encoding',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'last-modified',
] as const;

const ALLOWED_HOSTS = new Set([
    'api.ganjoor.net',
    'bayanbox.ir',
    'ganjgah.ir',
    'ganjoor.net',
    'i.ganjoor.net',
    'offline.ganjoor.net',
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

    const upstreamHeaders = new Headers();
    const range = request.headers.get('range');

    if (range) {
        upstreamHeaders.set('range', range);
    }

    upstreamHeaders.set(
        'user-agent',
        'Mozilla/5.0 (compatible; GanjoorakAudioProxy/1.0)',
    );

    const upstreamResponse = await fetch(parsedUrl.toString(), {
        headers: upstreamHeaders,
        cache: 'no-store',
    });

    const headers = new Headers();

    AUDIO_RESPONSE_HEADERS.forEach((headerName) => {
        const value = upstreamResponse.headers.get(headerName);
        if (value) {
            headers.set(headerName, value);
        }
    });

    if (!headers.has('content-type')) {
        headers.set('content-type', 'audio/mpeg');
    }

    headers.set('access-control-allow-origin', '*');

    return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers,
    });
}
