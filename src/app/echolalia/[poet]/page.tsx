import { notFound, redirect } from "next/navigation";

const isValidPoetRouteSlug = (slug: string) =>
  slug.length >= 2 && !/[/?#\\\u0000-\u001F\u007F]/.test(slug);

export default async function EcholaliaPoetRedirect({
  params,
}: {
  params: Promise<{ poet: string }>;
}) {
  const { poet } = await params;
  const poetSlug = poet || "";

  if (!isValidPoetRouteSlug(poetSlug)) {
    notFound();
  }

  redirect(`/${poetSlug}`);
}
