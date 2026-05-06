import { NextResponse } from "next/server";
import axios from "axios";
import echolaliaApi from "@/api/EcholaliaApi";
import { logger } from "@/utils/logger";

export const dynamic = "force-dynamic";

const redirectToDefaultPoetImage = (requestUrl: string) => {
  const response = NextResponse.redirect(
    new URL("/images/default-poet.png", requestUrl),
  );
  response.headers.set("Cache-Control", "public, max-age=86400");
  return response;
};

const getAxiosErrorSummary = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  return {
    message: error.message,
    status: error.response?.status,
    url: error.config?.url,
  };
};

export async function GET(
  _request: Request,
  { params }: { params: { categoryId: string } },
) {
  const categoryId = Number(params.categoryId);

  if (!Number.isInteger(categoryId) || categoryId < 1) {
    return redirectToDefaultPoetImage(_request.url);
  }

  try {
    const imageUrl = await echolaliaApi.getPoetImageUrl(categoryId);

    if (!imageUrl) {
      return redirectToDefaultPoetImage(_request.url);
    }

    const imageResponse = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      proxy: false,
      timeout: 15000,
    });

    return new NextResponse(imageResponse.data, {
      status: 200,
      headers: {
        "Content-Type": imageResponse.headers["content-type"] || "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (error) {
    logger.error(
      "Error fetching Echolalia poet image:",
      getAxiosErrorSummary(error),
    );
    return redirectToDefaultPoetImage(_request.url);
  }
}
