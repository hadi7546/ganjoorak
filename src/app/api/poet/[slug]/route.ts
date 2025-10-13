import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { logger } from '@/utils/logger';

export const dynamic = 'force-dynamic'; // Mark this route as dynamic
export const revalidate = 0; // Disable caching for this route

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
        logger.log(`Fetching poet data for slug: ${poetSlug} on Vercel deployment: ${!!process.env.VERCEL}`);

        // Try to fetch from blob storage
        try {
            logger.log("Listing blobs from storage...");
            logger.log("Environment:", process.env.NODE_ENV);

            const { blobs } = await list({
                prefix: `poems/${poetSlug}`, // Only look in the poems directory with the specific poet slug
            });

            logger.log(`Found ${blobs.length} matching blobs`);

            if (blobs.length === 0) {
                logger.log(`No blob found for poet slug: ${poetSlug}`);

                // Try to read from local file in public directory as fallback
                try {
                    logger.log(`Attempting to read from local public file for poet: ${poetSlug}`);

                    // Refer to the fallback path - this won't work in the API route but helps with debugging
                    const fallbackPath = `/poems/${poetSlug}.json`;
                    logger.log(`Fallback path would be: ${fallbackPath}`);

                    return NextResponse.json(
                        { error: `Poet data not found for ${poetSlug}. Please check the client-side fallback.` },
                        { status: 404, headers: corsHeaders }
                    );
                } catch (localError) {
                    logger.error("Error with local file fallback:", localError);
                    return NextResponse.json(
                        { error: `Poet data not found for ${poetSlug} in blob storage or local fallback` },
                        { status: 404, headers: corsHeaders }
                    );
                }
            }

            // Get the first matching blob (should only be one)
            const poetBlob = blobs[0];
            logger.log(`Found poet blob: ${poetBlob.pathname}, URL: ${poetBlob.url}`);

            // Get the blob content
            const response = await fetch(poetBlob.url, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                logger.error(`Error fetching blob content: ${response.status} ${response.statusText}`);
                return NextResponse.json(
                    { error: `Error fetching blob content: ${response.statusText}` },
                    { status: response.status, headers: corsHeaders }
                );
            }

            const data = await response.json();
            logger.log("Successfully fetched and parsed poet data from blob");

            // Add cache control headers to prevent caching
            const headers = {
                ...corsHeaders,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };

            // Return the data with headers
            return NextResponse.json(data, { headers });
        } catch (blobError: any) {
            logger.error("Error fetching from blob storage:", blobError);
            return NextResponse.json(
                { error: "Error fetching from blob storage", details: blobError?.message || String(blobError) },
                { status: 500, headers: corsHeaders }
            );
        }
    } catch (error: any) {
        logger.error(`Error getting poet data:`, error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message || String(error) },
            { status: 500, headers: corsHeaders }
        );
    }
} 