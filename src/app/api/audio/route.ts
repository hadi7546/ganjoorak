import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Mark this route as dynamic

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        if (!url.startsWith('https://bayanbox.ir/')) {
            return NextResponse.json({ error: 'Invalid URL domain' }, { status: 400 });
        }

        // Fetch the audio file
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
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
            };

            return new NextResponse(chunk, {
                status: 206,
                headers: head,
            });
        }

        // Return full file if no range is requested
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileSize.toString(),
                'Accept-Ranges': 'bytes',
            },
        });
    } catch (error) {
        console.error('Error proxying audio:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}