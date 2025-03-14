import { Metadata } from "next";
import customApi from "@/api/CustomApi";
import { poetNames } from "@/types/poets";
import { poetSlugs } from "@/types/poets";

type Props = {
  params: { poet: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const poetName = poetNames[poetSlugs[params.poet]];
    return {
      title: "گنجورک",
      description: "شعرهای " + poetName, // First line of the poem as description
    };
  } catch (error) {
    return {
      title: "گنجورک",
      description: 'یک تجربه بهتر از شنیدن و خواندن شعر فارسی.',
    };
  }
}

export default function Layout({ children }: Props) {
  return children;
}
