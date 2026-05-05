import { NextRequest, NextResponse } from 'next/server';
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
        logger.log(`Fetching local poet data for slug: ${poetSlug}`);

        try {
            const filePath = path.join(process.cwd(), 'public', 'poems', `${poetSlug}.json`);

            if (!fs.existsSync(filePath)) {
                logger.log(`Local poet data not found: ${filePath}`);
                return NextResponse.json(
                    { error: `Poet data not found for ${poetSlug}` },
                    { status: 404, headers: corsHeaders }
                );
            }

            const rawData = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(rawData);
            data.imageUrl = `/images/poets/${poetSlug}.jpeg`;
            logger.log("Successfully fetched and parsed local poet data");

            // Add cache control headers to prevent caching
            const headers = {
                ...corsHeaders,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };

            // Return the data with headers
            return NextResponse.json(data, { headers });
        } catch (localError: any) {
            logger.error("Error fetching local poet data:", localError);
            return NextResponse.json(
                { error: "Error fetching local poet data", details: localError?.message || String(localError) },
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
