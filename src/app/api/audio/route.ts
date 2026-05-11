import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export const dynamic = 'force-dynamic'; // Mark this route as dynamic

// List of allowed domains for audio files
const ALLOWED_DOMAINS = [
    'https://bayanbox.ir/',
    'https://api.ganjoor.net/',
    'https://i.ganjoor.net/',
    'https://ganjgah.ir/'
];
const AUDIO_PROXY_TIMEOUT_MS = 30000;

// Function to check if a URL is from an allowed domain
function isAllowedDomain(url: string): boolean {
    return ALLOWED_DOMAINS.some(domain => url.startsWith(domain));
}

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        // Security check: Verify the URL is from an allowed domain
        if (!isAllowedDomain(url)) {
            logger.warn(`Rejected unauthorized audio URL: ${url}`);
            return NextResponse.json({
                error: 'Invalid URL domain. Only specific domains are allowed.'
            }, { status: 403 });
        }

        logger.log(`Fetching authorized audio URL: ${url}`);

        // Fetch the audio file
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            cache: 'no-store', // Prevent caching at fetch level
            signal: AbortSignal.timeout(AUDIO_PROXY_TIMEOUT_MS),
        });

        if (!response.ok) {
            logger.error(`Error fetching audio: ${response.status} ${response.statusText}`);
            return NextResponse.json({ error: 'Failed to fetch audio' }, { status: response.status });
        }

        const audioBuffer = await response.arrayBuffer();
        const fileSize = audioBuffer.byteLength;

        // Parse range header
        const range = request.headers.get('range');
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            // Extract the requested chunk from the buffer
            const chunk = audioBuffer.slice(start, end + 1);

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize.toString(),
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            };

            return new NextResponse(chunk, {
                status: 206,
                headers: head,
            });
        }

        // If no range was requested, return the entire file
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileSize.toString(),
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        logger.error('Error proxying audio:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
