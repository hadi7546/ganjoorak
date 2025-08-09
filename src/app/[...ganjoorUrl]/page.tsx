// app/[...ganjoorUrl]/page.tsx
import { notFound, redirect } from "next/navigation";
import ganjoorApi from "@/api/GanjoorApi";
import { redirectWhitelist } from "@/data/redirect-whitelist";

export default async function GanjoorRedirectPage({
  params,
}: {
  params: { ganjoorUrl: string[] };
}) {
  const decodedSegments = params.ganjoorUrl.map(decodeURIComponent);

  let path;
  let hostname;

  if (decodedSegments[0] === 'http:' || decodedSegments[0] === 'https:') {
    path = decodedSegments[0] + '//' + decodedSegments.slice(1).join('/');
    try {
      const url = new URL(path);
      hostname = url.hostname;
    } catch (error) {
      notFound();
    }
  } else {
    path = '/' + decodedSegments.join('/');
  }

  if (hostname && !redirectWhitelist.some(domain => hostname.endsWith(domain))) {
    notFound();
  }

  const cleanPath = hostname ? new URL(path).pathname : path;

  const poemId = await ganjoorApi.getPoemIdByUrl(cleanPath);

  if (!poemId) {
    notFound();
  }

  redirect(`/poem/${poemId}`);
}
