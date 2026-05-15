import { NextRequest, NextResponse } from "next/server";
import { getGanjoorUpstreamOrigin } from "@/server/ganjoorUpstream";

export const dynamic = "force-dynamic";

const GANJOOR_PROXY_TIMEOUT_MS = 15000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.map(encodeURIComponent).join("/");
  const upstream = new URL(`/api/audio/${path}`, getGanjoorUpstreamOrigin());
  upstream.search = request.nextUrl.search;

  try {
    const response = await fetch(upstream, {
      headers: {
        Accept: request.headers.get("accept") || "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(GANJOOR_PROXY_TIMEOUT_MS),
    });

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.delete("content-encoding");
    headers.delete("content-length");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("Error proxying Ganjoor audio API request:", error);
    return NextResponse.json(
      { error: "Failed to proxy Ganjoor audio API request" },
      { status: 502 },
    );
  }
}
