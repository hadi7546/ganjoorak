import { Metadata } from "next";
import customApi from "@/api/CustomApi";
import ganjoorApi from "@/api/GanjoorApi";
import { PoetSlug, isValidPoetSlug, poetNames } from "@/types/poet";
import {
  PoetStructuredData,
  BreadcrumbStructuredData,
} from "@/components/StructuredData";

type Props = {
  params: { poet: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const poetSlug = params.poet;
  let poetName = "یافت نشد";

  try {
    if (isValidPoetSlug(poetSlug)) {
      poetName = poetNames[poetSlug];
    } else {
      const poetData = await ganjoorApi.getPoetBySlug(poetSlug);
      poetName = poetData.nickname || poetData.name;
    }
  } catch (error) {
    console.error("Error fetching poet info:", error);
    poetName = "یافت نشد";
  }

  return {
    title: `${poetName} | گنجورک`,
    description: `مجموعه‌ای از اشعار ${poetName} در گنجورک`,
    openGraph: {
      title: `${poetName} | گنجورک`,
      description: `مجموعه‌ای از اشعار ${poetName} در گنجورک`,
      type: "profile",
    },
    keywords: [poetName, "شعر", "فارسی", "اشعار", poetName.toLowerCase()],
  };
}

export default async function PoetLayout({ children, params }: Props) {
  const poetSlug = params.poet;
  let poetName = "یافت نشد";

  try {
    if (isValidPoetSlug(poetSlug)) {
      poetName = poetNames[poetSlug];
    } else {
      const poetData = await ganjoorApi.getPoetBySlug(poetSlug);
      poetName = poetData.nickname || poetData.name;
    }
  } catch (error) {
    console.error("Error fetching poet info:", error);
  }

  return (
    <>
      {children}
      {poetName !== "یافت نشد" && (
        <>
          <PoetStructuredData
            poet={{
              name: poetName,
              url: `https://ganjoorak.com/${poetSlug}`,
              description: `شاعر ایرانی و خالق آثار ادبیات فارسی`,
            }}
          />
          <BreadcrumbStructuredData
            items={[
              { name: "گنجورک", url: "https://ganjoorak.com" },
              { name: poetName, url: `https://ganjoorak.com/${poetSlug}` },
            ]}
          />
        </>
      )}
    </>
  );
}
