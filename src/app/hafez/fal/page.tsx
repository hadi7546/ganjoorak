'use client';

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaFeatherAlt, FaMagic, FaRegEye, FaSnowflake, FaSync } from "react-icons/fa";
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
  const [showInterpretation, setShowInterpretation] = useState(false);

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

  const fetchFal = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchInterpretations();

      if (!list?.length) {
        throw new Error("تعبیری برای نمایش در دسترس نیست");
      }

      const chosen = list[Math.floor(Math.random() * list.length)];
      const poem = await ganjoorApi.getPoemById(chosen.id);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0410] via-[#0f0a14] to-[#05020a] text-rose-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl border border-rose-100/15 bg-gradient-to-br from-white/5 via-[#120111]/30 to-[#0b0310]/60 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,0,85,0.1),transparent_40%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.08),transparent_42%)]" />

          <div className="relative p-6 sm:p-8 flex flex-col gap-6">
            <header className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-rose-200">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400/35 to-red-500/35 text-xl shadow-lg shadow-rose-500/30">
                  <FaFeatherAlt />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-rose-200/80">فال یلدایی حافظ</p>
                  <h1 className="text-2xl sm:text-3xl font-black text-rose-50">چله‌نشینی کوتاه</h1>
                  <p className="mt-1 text-xs sm:text-sm text-rose-100/80">یک فال جمع‌وجور با شعر هماهنگ با تعبیر</p>
                </div>
              </div>

              <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs text-rose-50 shadow-inner shadow-black/20">
                <FaSnowflake className="text-rose-200" />
                شب یلدا
              </span>
            </header>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] items-start">
              <div className="relative overflow-hidden rounded-2xl border border-rose-100/15 bg-gradient-to-br from-white/10 via-[#1a0a14]/60 to-[#0e0710]/70 p-5 shadow-xl">
                <div className="flex flex-wrap items-center gap-2 text-rose-100/90 text-xs">
                  <span className="rounded-full bg-rose-500/25 px-3 py-1 font-semibold text-rose-50">
                    {falData?.poem?.poet || "حافظ"}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-rose-100">
                    {falData?.poem?.title || "شعر در راه است"}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2.5">
                  {verses.length === 0 && (
                    <p className="text-rose-100/80">در حال آماده‌سازی شعر...</p>
                  )}
                  {verses.map((line, index) => (
                    <motion.p
                      key={`${line}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                      className="rounded-xl bg-white/5 px-4 py-3 text-base leading-7 text-rose-50 shadow-sm shadow-white/10"
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-2xl border border-rose-200/25 bg-gradient-to-br from-rose-500/20 via-amber-100/10 to-indigo-500/10 p-4 shadow-lg">
                  <div className="flex items-center gap-3 text-rose-50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/25 text-lg">
                      <FaMagic />
                    </span>
                    <div>
                      <p className="text-xs text-rose-100/80">پیغام فال هماهنگ</p>
                      <p className="text-sm font-semibold text-rose-50">
                        {falData?.fal?.title || "منتظر پیام فال"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-rose-50/80">
                    شعر و تعبیر با یک شناسه مشترک از گنجور و سرویس حافظ کنار هم نشسته‌اند.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={fetchFal}
                      disabled={loading}
                      className="group relative flex-1 min-w-[150px] overflow-hidden rounded-xl bg-gradient-to-r from-rose-400 to-red-500 px-4 py-2.5 text-center text-sm font-bold text-slate-950 shadow-lg shadow-rose-500/40 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/25 to-transparent opacity-0 transition group-hover:opacity-20" />
                      {loading ? "در حال گرفتن فال..." : "فال تازه"}
                      <FaSync className="mr-2 inline-block" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInterpretation(true)}
                      disabled={!falData?.fal}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-rose-50 shadow-md shadow-black/20 transition hover:-translate-y-0.5 hover:border-rose-200/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaRegEye />
                      <span>دیدن تعبیر</span>
                    </button>
                  </div>
                  {error && <p className="mt-2 text-amber-200 text-xs">{error}</p>}
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 via-slate-900/30 to-white/5 p-4 text-sm text-rose-100/80 shadow-inner shadow-black/30">
                  <div className="flex items-center justify-between gap-2 text-rose-100">
                    <span className="text-xs">شناسه شعر: {falData?.poem?.id ?? "—"}</span>
                    <span className="text-xs">شناسه تعبیر: {falData?.fal?.id ?? "—"}</span>
                  </div>
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
