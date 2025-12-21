'use client';

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaFeatherAlt, FaShareAlt, FaSync } from "react-icons/fa";
import type { Poem } from "@/types/poem";
import ganjoorApi from "@/api/GanjoorApi";
import { logger } from "@/utils/logger";

interface FalInterpretation {
  id: number;
  title: string;
  interpreter: string;
}

interface FalResponse {
  poem: Poem;
  fal: FalInterpretation;
}

function splitVerses(poem?: Poem) {
  if (!poem?.plainText) return [];
  return poem.plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function HafezFalPage() {
  const [falData, setFalData] = useState<FalResponse | null>(null);
  const [interpretations, setInterpretations] = useState<FalInterpretation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verses = useMemo(() => splitVerses(falData?.poem), [falData?.poem]);

  const fetchInterpretations = async () => {
    if (interpretations.length > 0) return interpretations;

    const response = await fetch("https://hafez-dxle.onrender.com/all", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("دریافت تعبیرها ناموفق بود");
    }

    const data = (await response.json()) as FalInterpretation[];
    setInterpretations(data);
    return data;
  };

  const fetchHafezPoemByGhazalNumber = async (
    ghazalNumber: number,
  ): Promise<Poem> => {
    const searchText = encodeURIComponent(`غزل شماره ${ghazalNumber}`);

    try {
      const searchResponse = await fetch(
        `https://api.ganjoor.net/api/ganjoor/poem/search?searchText=${searchText}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );

      if (searchResponse.ok) {
        const results = (await searchResponse.json()) as any;
        const poems = Array.isArray(results)
          ? results
          : Array.isArray(results?.poems)
          ? results.poems
          : [];

        const hafezMatch = poems.find(
          (poem: any) =>
            poem?.poet?.includes("حافظ") || poem?.poetNickname?.includes("حافظ"),
        );

        if (hafezMatch?.id) {
          return ganjoorApi.getPoemById(hafezMatch.id);
        }
      }
    } catch (err) {
      logger.error("Error searching poem by ghazal number", err);
    }

    return ganjoorApi.getPoemById(ghazalNumber);
  };

  const fetchFal = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchInterpretations();

      if (!list?.length) {
        throw new Error("تعبیری برای نمایش در دسترس نیست");
      }

      const chosen = list[Math.floor(Math.random() * list.length)];
      const poem = await fetchHafezPoemByGhazalNumber(chosen.id);

      setFalData({ poem, fal: chosen });
    } catch (err: any) {
      logger.error("Error fetching fal", err);
      setError(err?.message || "خطای ناشناخته رخ داده است");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createShareImage = async (poem?: Poem, fal?: FalInterpretation) => {
    if (!poem || !fal) return null;

    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.5, "#111827");
    gradient.addColorStop(1, "#0b1324");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(80, 90, width - 160, height - 220);

    ctx.fillStyle = "#e0e7ff";
    ctx.font = "bold 44px 'Vazirmatn', 'IRANSans', sans-serif";
    ctx.textAlign = "right";
    ctx.direction = "rtl" as CanvasDirection;
    ctx.fillText("فال حافظ", width - 120, 160);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 34px 'Vazirmatn', 'IRANSans', sans-serif";
    ctx.fillText(poem.title || "فال حافظ", width - 120, 230);

    ctx.font = "700 28px 'Vazirmatn', 'IRANSans', sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`شناسه شعر: ${poem.id}`, width - 120, 280);
    ctx.fillText(`عنوان فال: ${fal.title}`, width - 120, 325);

    ctx.font = "600 30px 'Vazirmatn', 'IRANSans', sans-serif";
    ctx.fillStyle = "#f8fafc";
    const verseLines = splitVerses(poem);
    let currentY = 380;
    const lineHeight = 48;
    const maxWidth = width - 200;

    verseLines.forEach((line) => {
      const words = line.split(" ");
      let composed = "";
      words.forEach((word) => {
        const test = composed ? `${composed} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth) {
          ctx.fillText(composed, width - 100, currentY);
          composed = word;
          currentY += lineHeight;
        } else {
          composed = test;
        }
      });
      if (composed) {
        ctx.fillText(composed, width - 100, currentY);
        currentY += lineHeight;
      }
      currentY += 10;
    });

    return canvas.toDataURL("image/png");
  };

  const handleShare = async () => {
    if (!falData?.poem || !falData.fal) return;

    try {
      const shareLink = new URL(`/hafez/fal/${falData.poem.id}`, window.location.origin).toString();
      const dataUrl = await createShareImage(falData.poem, falData.fal);

      if (!dataUrl) {
        setError("ساخت تصویر برای اشتراک‌گذاری ناموفق بود");
        return;
      }

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `fal-${falData.poem.id}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ url: shareLink, files: [file] })) {
        await navigator.share({
          title: falData.poem.title || "فال حافظ",
          text: falData.fal.title,
          url: shareLink,
          files: [file],
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: falData.poem.title || "فال حافظ",
          text: `${falData.fal.title}\n${shareLink}`,
          url: shareLink,
        });
      } else {
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = `fal-${falData.poem.id}.png`;
        anchor.click();
      }
    } catch (err: any) {
      logger.error("Error sharing fal", err);
      setError("اشتراک‌گذاری انجام نشد. دوباره تلاش کنید.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xl text-indigo-200 shadow-lg">
            <FaFeatherAlt />
          </span>
          <div>
            <p className="text-xs text-slate-300">فال حافظ</p>
            <h1 className="text-3xl font-black text-slate-50">فال امروز</h1>
            <p className="text-xs text-slate-400">شعر تصادفی از حافظ با شناسه منطبق</p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 font-semibold text-indigo-50">
                {falData?.poem?.poet || "حافظ"}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200">
                {falData?.poem?.title || "شعر در راه است"}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {verses.length === 0 && (
                <p className="text-slate-300">در حال آماده‌سازی شعر...</p>
              )}
              {verses.map((line, index) => (
                <motion.p
                  key={`${line}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="rounded-xl bg-white/5 px-4 py-3 text-base leading-7 text-slate-50 shadow-sm"
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-lg">
              <p className="text-sm font-semibold text-slate-100">{falData?.fal?.title || "منتظر پیام فال"}</p>
              <p className="mt-1 text-xs text-slate-400">شناسه شعر: {falData?.poem?.id ?? "—"}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fetchFal}
                  disabled={loading}
                  className="group relative flex-1 min-w-[150px] overflow-hidden rounded-xl bg-indigo-500 px-4 py-2.5 text-center text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-20" />
                  {loading ? "در حال گرفتن فال..." : "فال تازه"}
                  <FaSync className="mr-2 inline-block" />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!falData?.poem || loading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-md transition hover:-translate-y-0.5 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaShareAlt />
                  <span>اشتراک</span>
                </button>
              </div>
              {error && <p className="mt-2 text-amber-200 text-xs">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
