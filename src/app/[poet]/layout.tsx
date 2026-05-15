import { Metadata } from "next";
import { isValidPoetSlug, poetNames } from "@/types/poet";
import poetSourceIndex from "@/data/poet-source-index.json";

type Props = {
  params: Promise<{ poet: string }>;
  children: React.ReactNode;
};

type PoetSourceIndexEntry = {
  source: "ganjoor" | "echolalia";
  id?: number | null;
  name?: string;
  sourceGroupName?: string | null;
};

const indexedPoetSources = poetSourceIndex.sourcesBySlug as Record<
  string,
  PoetSourceIndexEntry | undefined
>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { poet: poetSlug } = await params;
  const poetName = isValidPoetSlug(poetSlug)
    ? poetNames[poetSlug]
    : indexedPoetSources[poetSlug]?.name || "شاعر ناشناخته";

  return {
    title: `${poetName} | گنجورک`,
    description: `مجموعه‌ای از اشعار ${poetName} در گنجورک`,
  };
}

export default function PoetLayout({ children }: Props) {
  return children;
}
