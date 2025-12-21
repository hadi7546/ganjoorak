'use client';

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaFeatherAlt,
  FaMagic,
  FaRegEye,
  FaMoon,
  FaSnowflake,
  FaSync,
} from "react-icons/fa";
import type { Poem } from "@/types/poem";
import ganjoorApi from "@/api/GanjoorApi";
import { logger } from "@/utils/logger";

interface FalResponse {
  poem: Poem;
  fal: {
    id: number;
    title: string;
    interpreter: string;
  } | null;
}

const gradientOverlay =
  "absolute inset-0 pointer-events-none opacity-80 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%)]" +
  ",radial-gradient(circle_at_80%_30%,rgba(255,0,85,0.12),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.1),transparent_45%)]";

function splitVerses(poem?: Poem) {
  if (!poem?.plainText) return [];
  return poem.plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function HafezFalPage() {
  const [falData, setFalData] = useState<FalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterpretation, setShowInterpretation] = useState(false);

  const verses = useMemo(() => splitVerses(falData?.poem), [falData?.poem]);

  const fetchFal = async () => {
    try {
      setLoading(true);
      setError(null);
      const poem = await ganjoorApi.getRandomPoemByPoet("hafez");

      let fal: FalResponse["fal"] = null;
      try {
        const response = await fetch("https://hafez-dxle.onrender.com/fal", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          fal = {
            id: data.id,
            title: data.title,
            interpreter: data.interpreter,
          };
        } else {
          logger.warn("Failed to fetch interpretation", response.statusText);
        }
      } catch (falError) {
        logger.error("Error fetching fal interpretation", falError);
      }

      setFalData({ poem, fal });
    } catch (err: any) {
      setError(err?.message || "خطای ناشناخته رخ داده است");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFal();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0410] via-[#0f0a14] to-[#05020a] text-rose-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="relative overflow-hidden rounded-[32px] border border-rose-100/15 bg-gradient-to-br from-white/5 via-[#120111]/30 to-[#0b0310]/60 shadow-2xl backdrop-blur-xl">
          <div className={gradientOverlay} />

          <div className="relative p-8 sm:p-10 flex flex-col gap-8">
            <header className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-rose-200">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400/30 to-red-500/30 text-2xl shadow-lg shadow-rose-500/30">
                  <FaFeatherAlt />
                </span>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-rose-200/80">فال حافظ شب یلدا</p>
                  <h1 className="text-3xl sm:text-4xl font-black text-rose-50 drop-shadow-[0_4px_16px_rgba(244,114,182,0.35)]">
                    قصه‌ی انار و برف
                  </h1>
                </div>
              </div>
              <p className="text-sm sm:text-base text-rose-100/80 leading-relaxed">
                با الهام از آیین شب یلدا، شمع و انار و برف را کنار شعر حافظ نشاندیم تا فال امشب حال‌وهوایی زمستانی و گرم داشته باشد.
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr] items-start">
              <div className="relative overflow-hidden rounded-3xl border border-rose-100/15 bg-gradient-to-br from-white/10 via-[#1a0a14]/60 to-[#0e0710]/70 p-6 shadow-xl">
                <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-rose-400/25 blur-3xl" />
                <div className="pointer-events-none absolute -right-8 -bottom-14 h-36 w-36 rounded-full bg-indigo-500/15 blur-3xl" />
                <div className="flex flex-wrap items-center gap-3 text-rose-100/90">
                  <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-50">
                    {falData?.poem?.poet || "حافظ"}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                    {falData?.poem?.title || "شعر تصادفی"}
                  </span>
                  <span className="flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-[11px] font-semibold text-rose-100/80">
                    <FaSnowflake className="text-sky-200" /> شب یلدا
                  </span>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  {verses.length === 0 && (
                    <p className="text-rose-100/80">در حال آماده‌سازی شعر...</p>
                  )}
                  {verses.map((line, index) => (
                    <motion.p
                      key={`${line}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="rounded-2xl bg-white/5 px-4 py-3 text-lg leading-8 text-rose-50 shadow-sm shadow-white/10"
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-3xl border border-rose-200/25 bg-gradient-to-br from-rose-500/25 via-amber-100/10 to-indigo-500/10 p-5 shadow-lg">
                  <div className="flex items-center gap-3 text-rose-50">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/25 text-lg">
                      <FaMagic />
                    </span>
                    <div>
                      <p className="text-sm text-rose-100/80">پیغام فال</p>
                      <p className="text-base font-semibold text-rose-50">
                        {falData?.fal?.title || "منتظر پیام فال"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-rose-50/80">
                    تعبیر فال حافظ با حال‌وهوای یلدایی برایت ارسال می‌شود. برای خواندن توضیح کامل روی دکمه زیر بزن.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={fetchFal}
                      disabled={loading}
                      className="group relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-400 to-red-500 px-4 py-3 text-center text-sm font-bold text-slate-950 shadow-lg shadow-rose-500/40 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition group-hover:opacity-20" />
                      {loading ? "در حال گرفتن فال..." : "فال تازه"}
                      <FaSync className="mr-2 inline-block" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInterpretation(true)}
                      disabled={!falData?.fal}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-rose-50 shadow-md shadow-black/20 transition hover:-translate-y-0.5 hover:border-rose-200/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaRegEye />
                      <span>دیدن تعبیر</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 via-slate-900/40 to-white/5 p-4 text-sm text-rose-100/80 shadow-inner shadow-black/30">
                  <div className="flex items-center gap-2 text-rose-100">
                    <FaMoon className="text-amber-200" />
                    <span>فال امشب از گنجور و سرویس تعبیر حافظ دریافت می‌شود.</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-rose-100/70">
                    شعر مستقیم با <span className="font-semibold">ganjoorApi</span> و تعبیر از <code className="rounded bg-black/30 px-2 py-1">https://hafez-dxle.onrender.com/fal</code> خوانده می‌شود.
                  </p>
                  {error && <p className="mt-2 text-amber-200">{error}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInterpretation && falData?.fal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative max-w-2xl w-full overflow-hidden rounded-3xl border border-rose-200/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_30%,rgba(244,114,182,0.14),transparent_35%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.06),transparent_40%)]" />
              <div className="relative flex flex-col gap-3 text-rose-50">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-rose-200/70">تعبیر فال</p>
                    <h2 className="text-xl font-black">{falData.fal.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInterpretation(false)}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-rose-50 hover:border-rose-200/60"
                  >
                    بستن
                  </button>
                </div>
                <p className="leading-7 text-rose-50/90">{falData.fal.interpreter}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
