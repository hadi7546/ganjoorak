import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() || "";
  const isShortDomain = host === "gnjk.ir" || host === "www.gnjk.ir";

  if (
    isShortDomain &&
    (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "")
  ) {
    return NextResponse.redirect("https://ganjoorak.ir");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
