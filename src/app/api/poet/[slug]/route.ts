import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic'; // Mark this route as dynamic

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
            console.log("Listing blobs from storage...");
            const { blobs } = await list({
                prefix: `poems/${poetSlug}`, // Only look in the poems directory with the specific poet slug
            });

            if (blobs.length === 0) {
                console.log(`No blob found for poet slug: ${poetSlug}`);
                return NextResponse.json(
                    { error: `Poet data not found for ${poetSlug}` },
                    { status: 404, headers: corsHeaders }
                );
            }

            // Get the first matching blob (should only be one)
            const poetBlob = blobs[0];
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