import { notFound, redirect } from "next/navigation";

const isValidPoetRouteSlug = (slug: string) =>
  slug.length >= 2 && !/[/?#\\\u0000-\u001F\u007F]/.test(slug);

export default function EcholaliaPoetRedirect({
  params,
}: {
  params: { poet: string };
}) {
  const poetSlug = params.poet || "";

  if (!isValidPoetRouteSlug(poetSlug)) {
    notFound();
  }

  redirect(`/${poetSlug}`);
}
