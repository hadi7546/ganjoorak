import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const poetSlug = params.slug;
        console.log(`Fetching poet data for slug: ${poetSlug}`);

        // Try to fetch from blob storage
        try {
            // find the poet from poems folder
            console.log("Listing blobs from storage...");
            const { blobs } = await list({
                token: "vercel_blob_rw_7ElMsR3m4BC7Q4TH_4ia90f98dNlptL059V4PYRHuCdlMU9",
            });

            console.log(`Found ${blobs.length} blobs in storage`);

            // Log the first few blobs to see what's available
            blobs.slice(0, 5).forEach(blob => {
                console.log(`Blob: ${blob.pathname}, URL: ${blob.url}`);
            });

            // Look specifically for files in the /poems/ directory with .json extension
            const poetBlob = blobs.find(blob =>
                blob.pathname.includes(`/poems/${poetSlug}.json`) ||
                blob.pathname.includes(`poems/${poetSlug}.json`)
            );

            if (poetBlob) {
                console.log(`Found poet blob: ${poetBlob.pathname}`);
                // Get the blob content
                const response = await fetch(poetBlob.url);

                if (!response.ok) {
                    console.error(`Error fetching blob content: ${response.status} ${response.statusText}`);
                    return NextResponse.json(
                        { error: `Error fetching blob content: ${response.statusText}` },
                        { status: response.status, headers: corsHeaders }
                    );
                }

                const data = await response.json();
                console.log("Successfully fetched and parsed poet data");

                // Return the data with CORS headers
                return NextResponse.json(data, { headers: corsHeaders });
            }

            console.log(`No blob found for poet slug: ${poetSlug}`);
            // If no blob found, return a 404
            return NextResponse.json(
                { error: `Poet data not found for ${poetSlug}` },
                { status: 404, headers: corsHeaders }
            );
        } catch (blobError: any) {
            console.error("Error fetching from blob storage:", blobError);
            return NextResponse.json(
                { error: "Error fetching from blob storage", details: blobError?.message || String(blobError) },
                { status: 500, headers: corsHeaders }
            );
        }
    } catch (error: any) {
        console.error(`Error getting poet data:`, error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500, headers: corsHeaders }
        );
    }
} 