import { NextResponse } from "next/server";
import ganjoorApi from "@/api/GanjoorApi";
import poetSourceIndex from "@/data/poet-source-index.json";
import { getDailyPoemDateKey, pickDeterministicIndex } from "@/utils/dailyPoem";

export const dynamic = "force-dynamic";

const collectGanjoorSlugs = () =>
  Object.entries(poetSourceIndex.sourcesBySlug)
    .filter(([, entry]) => entry?.source === "ganjoor" && typeof entry.id === "number")
    .map(([slug, entry]) => ({
      slug,
      id: entry?.id as number,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

export async function GET() {
  try {
    const dateKey = getDailyPoemDateKey();
    const poets = collectGanjoorSlugs();

    if (poets.length === 0) {
      const poem = await ganjoorApi.getRandomPoem();
      return NextResponse.json({ dateKey, poem });
    }

    const poetEntry = poets[pickDeterministicIndex(`${dateKey}:poet`, poets.length)];
    const catalog = await ganjoorApi.getPoetCatalog(poetEntry.slug, poetEntry.id);
    const poemIds = ganjoorApi.collectPoemIdsFromCategory(catalog.category);

    if (poemIds.length === 0) {
      const poem = await ganjoorApi.getRandomPoemByPoetId(poetEntry.id);
      return NextResponse.json({ dateKey, poem });
    }

    const poemId = poemIds[pickDeterministicIndex(`${dateKey}:poem`, poemIds.length)];
    const poem = await ganjoorApi.getPoemById(poemId);

    return NextResponse.json({
      dateKey,
      poem,
    });
  } catch (error) {
    console.error("Failed to resolve daily poem:", error);
    return NextResponse.json(
      { error: "متأسفانه شعر روز در دسترس نیست." },
      { status: 500 },
    );
  }
}
