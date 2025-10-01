import { Metadata } from "next";
import customApi from "@/api/CustomApi";
import ganjoorApi from "@/api/GanjoorApi";
import { PoetSlug, isValidPoetSlug, poetNames } from "@/types/poet";

type Props = {
  params: { poet: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const poetSlug = params.poet;
  let poetName = 'شاعر ناشناخته';

  try {
    if (isValidPoetSlug(poetSlug)) {
      poetName = poetNames[poetSlug];
    } else {
      const poetData = await ganjoorApi.getPoetBySlug(poetSlug);
      poetName = poetData.nickname || poetData.name;
    }
  } catch (error) {
    console.error('Error fetching poet info:', error);
  }

  return {
    title: `${poetName} | گنجورک`,
    description: `مجموعه‌ای از اشعار ${poetName} در گنجورک`,
  };
}

export default function PoetLayout({ children }: Props) {
  return children;
}
