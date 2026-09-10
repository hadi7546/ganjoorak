import { NextRequest, NextResponse } from "next/server";
import { getSemanticSearchUpstreamOrigin } from "@/server/ganjoorUpstream";

export const dynamic = "force-dynamic";

const SEMANTIC_PROXY_TIMEOUT_MS = 30000;

export async function POST(request: NextRequest) {
  const upstream = new URL(
    "/api/ganjoor/search/semantic",
    getSemanticSearchUpstreamOrigin(),
  );

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        Accept: request.headers.get("accept") || "application/json",
        "Content-Type":
          request.headers.get("content-type") || "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(SEMANTIC_PROXY_TIMEOUT_MS),
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
    console.error("Error proxying Ganjoor semantic search:", error);
    return NextResponse.json(
      { error: "Failed to proxy semantic search request" },
      { status: 502 },
    );
  }
}
