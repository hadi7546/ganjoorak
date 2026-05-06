import { Metadata } from "next";
import { PoetSlug, isValidPoetSlug, poetNames } from "@/types/poet";
import poetSourceIndex from "@/data/poet-source-index.json";

type Props = {
  params: { id: string; poet: string };
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
  const poetSlug = params.poet;
  const poetName =
    (isValidPoetSlug(poetSlug)
      ? poetNames[poetSlug as PoetSlug]
      : indexedPoetSources[poetSlug]?.name) || "شاعر ناشناخته";

  return {
    title: `شعر از ${poetName} | گنجورک`,
    description: "یک تجربه بهتر از شنیدن و خواندن شعر فارسی در گنجورک",
  };
}

export default function PoemLayout({ children }: Props) {
  return children;
}
