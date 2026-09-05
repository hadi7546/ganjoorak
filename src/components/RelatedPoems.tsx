"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FaChevronLeft } from "react-icons/fa";
import ganjoorApi from "@/api/GanjoorApi";
import PoetImage from "@/components/PoetImage";
import type { GanjoorQuotedPoem } from "@/types/ganjoor";
import { getIndexedPoetImageUrl } from "@/utils/poetImages";
import { logger } from "@/utils/logger";
import "../styles/RelatedPoems.css";

interface RelatedPoemsProps {
  poemId: number;
  source?: string;
}

interface RelatedPoemCard {
  key: string;
  href: string;
  title: string;
  poetName: string;
  bookTitle: string;
  preview: string;
  poetImageUrl: string;
}

const SKELETON_COUNT = 3;
const persianNumber = new Intl.NumberFormat("fa-IR");

// Related poems rarely change; remember them so paging back and forth in the
// feed doesn't re-fetch (and re-skeleton) the same poem.
const quotedCache = new Map<number, GanjoorQuotedPoem[]>();

const ensureLeadingSlash = (value: string) =>
  value.startsWith("/") ? value : `/${value}`;

const firstNonEmptyLine = (text?: string | null) =>
  text
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";

const toCard = (item: GanjoorQuotedPoem): RelatedPoemCard | null => {
  const relatedId = item.relatedPoemId ?? item.poem?.id ?? null;
  const fullUrl = item.cachedRelatedPoemFullUrl || item.poem?.fullUrl || "";
  const href = fullUrl
    ? ensureLeadingSlash(fullUrl)
    : relatedId
      ? `/poem/${relatedId}`
      : null;

  if (!href) {
    return null;
  }

  const fullTitle = item.cachedRelatedPoemFullTitle || item.poem?.fullTitle || "";
  const titleParts = fullTitle
    .split(" » ")
    .map((part) => part.trim())
    .filter(Boolean);
  const poetName = item.cachedRelatedPoemPoetName || titleParts[0] || "";
  const title =
    (titleParts.length > 1 ? titleParts[titleParts.length - 1] : "") ||
    item.poem?.title ||
    fullTitle ||
    "شعر مرتبط";
  const bookTitle =
    titleParts.length > 2 ? titleParts.slice(1, -1).join("، ") : "";

  const poetSlug =
    (item.cachedRelatedPoemPoetUrl || fullUrl)
      .split("/")
      .map((segment) => segment.trim())
      .find(Boolean) ?? "";
  const poetImageUrl =
    getIndexedPoetImageUrl("ganjoor", poetSlug) ||
    item.cachedRelatedPoemPoetImage ||
    (poetSlug ? `/api/ganjoor/poet/image/${poetSlug}.gif` : "");

  const preview =
    item.relatedCoupletVerse1?.trim() ||
    firstNonEmptyLine(item.poem?.plainText) ||
    item.coupletVerse1?.trim() ||
    "";

  return {
    key: item.id || `${relatedId ?? href}`,
    href,
    title,
    poetName,
    bookTitle,
    preview,
    poetImageUrl,
  };
};

const RelatedPoems = ({ poemId, source }: RelatedPoemsProps) => {
  const isGanjoorPoem = !source || source === "ganjoor";
  const cached = isGanjoorPoem ? quotedCache.get(poemId) : undefined;
  const [items, setItems] = useState<GanjoorQuotedPoem[]>(cached ?? []);
  const [loading, setLoading] = useState(isGanjoorPoem && !cached);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isGanjoorPoem) {
      setItems([]);
      setLoading(false);
      return;
    }

    const known = quotedCache.get(poemId);
    if (known) {
      setItems(known);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setItems([]);
    setLoading(true);

    ganjoorApi
      .getQuotedPoems(poemId)
      .then((quoted) => {
        quotedCache.set(poemId, quoted);
        if (!cancelled) {
          setItems(quoted);
        }
      })
      .catch((error) => {
        logger.error("Failed to load related poems:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isGanjoorPoem, poemId]);

  const cards = useMemo(() => {
    const seen = new Set<string>();
    return items
      .map(toCard)
      .filter((card): card is RelatedPoemCard => {
        if (!card || seen.has(card.href)) {
          return false;
        }
        seen.add(card.href);
        return true;
      });
  }, [items]);

  if (loading) {
    return (
      <section
        className="related-poems related-poems--loading"
        aria-label="شعرهای مرتبط"
        aria-busy="true"
      >
        <div className="related-poems-header">
          <span className="related-poems-skeleton related-poems-skeleton--title" />
        </div>
        <ul className="related-poems-grid">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <li key={index} className="related-poem-card related-poem-card--skeleton">
              <span className="related-poems-skeleton related-poems-skeleton--avatar" />
              <span className="related-poem-card-body">
                <span className="related-poems-skeleton related-poems-skeleton--meta" />
                <span className="related-poems-skeleton related-poems-skeleton--heading" />
                <span className="related-poems-skeleton related-poems-skeleton--line" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  const headingId = `related-poems-${poemId}`;
  const sectionMotion = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <motion.section
      className="related-poems"
      aria-labelledby={headingId}
      {...sectionMotion}
    >
      <div className="related-poems-header">
        <h3 id={headingId} className="related-poems-title">
          شعرهای مرتبط
        </h3>
        <span className="related-poems-count">
          {persianNumber.format(cards.length)} شعر
        </span>
      </div>
      <ul className="related-poems-grid">
        {cards.map((card, index) => (
          <motion.li
            key={card.key}
            className="related-poem-card"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.28,
                    delay: 0.05 + Math.min(index, 5) * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }
            }
          >
            <Link
              href={card.href}
              className="related-poem-card-link"
              aria-label={
                card.poetName ? `${card.title}، ${card.poetName}` : card.title
              }
            >
              <span className="related-poem-card-avatar" aria-hidden="true">
                <PoetImage
                  imgUrl={card.poetImageUrl}
                  alt=""
                  width={40}
                  height={40}
                />
              </span>
              <span className="related-poem-card-body">
                {(card.poetName || card.bookTitle) && (
                  <span className="related-poem-card-meta">
                    {card.poetName}
                    {card.poetName && card.bookTitle ? " · " : ""}
                    {card.bookTitle}
                  </span>
                )}
                <strong className="related-poem-card-title">{card.title}</strong>
                {card.preview && (
                  <span className="related-poem-card-preview">{card.preview}</span>
                )}
              </span>
              <FaChevronLeft className="related-poem-card-chevron" aria-hidden="true" />
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
};

export default RelatedPoems;
