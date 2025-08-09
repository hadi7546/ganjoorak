import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import ganjoorApi from "@/api/GanjoorApi";
import { redirectWhitelist } from "@/data/redirect-whitelist";

export default async function GanjoorRedirectPage({
  params,
}: {
  params: { ganjoorUrl: string[] };
}) {
  const host = headers().get("host")?.toLowerCase() || "";
  const decodedSegments = params.ganjoorUrl.map(decodeURIComponent);

  let path;
  let hostname;

  if (decodedSegments[0] === 'http:' || decodedSegments[0] === 'https:') {
    // Full URL form: gnjk.ir/https://ganjoor.net/...
    path = decodedSegments[0] + '//' + decodedSegments.slice(1).join('/');
    try {
      const url = new URL(path);
      hostname = url.hostname;
    } catch (error) {
      notFound();
    }
  } else if (decodedSegments.length > 0 && /\./.test(decodedSegments[0])) {
    // Host-only or no-scheme form: gnjk.ir/ganjoor.net/... or gnjk.ir/www.ganjoor.net/...
    // Assume https and parse
    path = 'https://' + decodedSegments.join('/');
    try {
      const url = new URL(path);
      hostname = url.hostname;
    } catch (error) {
      notFound();
    }
  } else {
    // Path-only form: treat as Ganjoor path directly
    path = '/' + decodedSegments.join('/');
  }

  if (hostname && !redirectWhitelist.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
    notFound();
  }

  const cleanPath = hostname ? new URL(path).pathname : path;

  const poemId = await ganjoorApi.getPoemIdByUrl(cleanPath);

  if (!poemId) {
    notFound();
  }

  if (host === "gnjk.ir" || host === "www.gnjk.ir") {
    redirect(`https://ganjoorak.ir/poem/${poemId}`);
  }
  redirect(`/poem/${poemId}`);
}
