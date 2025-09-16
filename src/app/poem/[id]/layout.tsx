import { Metadata } from "next";
import ganjoorApi from "@/api/GanjoorApi";

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const poem = await ganjoorApi.getPoemById(parseInt(params.id));
    return {
      title: `${poem.fullTitle || poem.title} - ${poem.poet}`,
      description: `مجموعه‌ای از اشعار ${poem.poet}`,
      openGraph: {
        title: `${poem.fullTitle || poem.title} - ${poem.poet}`,
        description: `مجموعه‌ای از اشعار ${poem.poet}`,
      },
    };
  } catch (error) {
    return {
      title: "گنجورک",
      description: "راحت‌تر شعر بخوانیم و شعر گوش دهیم.",
      openGraph: {
        siteName: "گنجورک",
        description: "راحت‌تر شعر بخوانیم و شعر گوش دهیم.",
      },
    };
  }
}

export default function Layout({ children }: Props) {
  return children;
}
