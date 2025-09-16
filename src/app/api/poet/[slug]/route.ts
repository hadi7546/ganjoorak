import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const poetSlug = params.slug;

    try {
      const { blobs } = await list({
        prefix: `poems/${poetSlug}`,
      });

      if (blobs.length === 0) {
        try {
          const fallbackPath = `/poems/${poetSlug}.json`;

          return NextResponse.json(
            {
              error: `Poet data not found for ${poetSlug}. Please check the client-side fallback.`,
            },
            { status: 404, headers: corsHeaders },
          );
        } catch (localError) {
          console.error("Error with local file fallback:", localError);
          return NextResponse.json(
            {
              error: `Poet data not found for ${poetSlug} in blob storage or local fallback`,
            },
            { status: 404, headers: corsHeaders },
          );
        }
      }

      const poetBlob = blobs[0];

      const response = await fetch(poetBlob.url, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        console.error(
          `Error fetching blob content: ${response.status} ${response.statusText}`,
        );
        return NextResponse.json(
          { error: `Error fetching blob content: ${response.statusText}` },
          { status: response.status, headers: corsHeaders },
        );
      }

      const data = await response.json();

      const headers = {
        ...corsHeaders,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      };

      return NextResponse.json(data, { headers });
    } catch (blobError: any) {
      console.error("Error fetching from blob storage:", blobError);
      return NextResponse.json(
        {
          error: "Error fetching from blob storage",
          details: blobError?.message || String(blobError),
        },
        { status: 500, headers: corsHeaders },
      );
    }
  } catch (error: any) {
    console.error(`Error getting poet data:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
