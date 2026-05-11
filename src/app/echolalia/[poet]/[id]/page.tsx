"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import echolaliaApi from "@/api/EcholaliaApi";
import ErrorScreen from "@/components/ErrorScreen";
import LoadingScreen from "@/components/LoadingScreen";
import { logger } from "@/utils/logger";

const isValidPoetRouteSlug = (slug: string) =>
  slug.length >= 2 && !/[/?#\\\u0000-\u001F\u007F]/.test(slug);

export default function LegacyEcholaliaPoemPage() {
  const params = useParams();
  const router = useRouter();
  const poetSlug = (params?.poet as string) || "";
  const poemId = Number(params?.id);

  useEffect(() => {
    const redirectToCleanUrl = async () => {
      if (!poetSlug) {
        return;
      }

      if (Number.isInteger(poemId) && poemId > 0) {
        router.replace(`/${poetSlug}/${poemId}`);
        return;
      }

      try {
        const randomPoem = await echolaliaApi.getRandomPoemByPoetSlug(poetSlug);
        router.replace(`/${poetSlug}/${randomPoem.id}`);
      } catch (error) {
        logger.error("Error resolving legacy Echolalia poem URL:", error);
      }
    };

    redirectToCleanUrl();
  }, [poemId, poetSlug, router]);

  if (!isValidPoetRouteSlug(poetSlug)) {
    return (
      <ErrorScreen
        message="نشانی شعر معتبر نیست."
        onRetry={() => router.replace("/")}
      />
    );
  }

  return <LoadingScreen />;
}
