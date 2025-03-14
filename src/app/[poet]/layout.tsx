import { Metadata } from "next";
import customApi from "@/api/CustomApi";

type Props = {
  params: { poet: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    return {
      title: "گنجورک",
      description: "شعرهای " + params.poet, // First line of the poem as description
    };
  } catch (error) {
    return {
      title: "گنجورک",
      description: 'یک تجربه راحت از شنیدن و خواندن شعر.',
    };
  }
}

export default function Layout({ children }: Props) {
  return children;
}
