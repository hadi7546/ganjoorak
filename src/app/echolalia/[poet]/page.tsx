import { notFound, redirect } from "next/navigation";

export default function EcholaliaPoetRedirect({
  params,
}: {
  params: { poet: string };
}) {
  const poetSlug = params.poet || "";

  if (!poetSlug || poetSlug.length < 2 || /[^a-z0-9-]/i.test(poetSlug)) {
    notFound();
  }

  redirect(`/${poetSlug}`);
}
