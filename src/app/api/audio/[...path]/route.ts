import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPSTREAM_URL = "http://api.offline.ganjoor.net";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path.map(encodeURIComponent).join("/");
  const upstream = new URL(`/api/audio/${path}`, UPSTREAM_URL);
  upstream.search = request.nextUrl.search;

  try {
    const response = await fetch(upstream, {
      headers: {
        Accept: request.headers.get("accept") || "application/json",
      },
      cache: "no-store",
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
