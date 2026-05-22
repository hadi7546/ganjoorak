"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ganjoorApi from "@/api/GanjoorApi";
import type { GanjoorQuotedPoem } from "@/types/ganjoor";
import { logger } from "@/utils/logger";

interface RelatedPoemsProps {
  poemId: number;
  source?: string;
}

const RelatedPoems = ({ poemId, source }: RelatedPoemsProps) => {
  const [items, setItems] = useState<GanjoorQuotedPoem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (source && source !== "ganjoor") {
      setItems([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const quoted = await ganjoorApi.getQuotedPoems(poemId);
        if (!cancelled) {
          setItems(quoted);
        }
      } catch (error) {
        logger.error("Failed to load related poems:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [poemId, source]);

  if (loading || items.length === 0) {
    return null;
  }

  return (
    <section className="related-poems" aria-label="شعرهای مرتبط">
      <h3 className="related-poems-title">شعرهای مرتبط</h3>
      <ul className="related-poems-list">
        {items.map((item) => {
          const relatedId = item.relatedPoemId ?? item.poem?.id;
          const href = item.cachedRelatedPoemFullUrl
            ? item.cachedRelatedPoemFullUrl.startsWith("/")
              ? item.cachedRelatedPoemFullUrl
              : `/${item.cachedRelatedPoemFullUrl}`
            : relatedId
              ? `/poem/${relatedId}`
              : null;
          const title =
            item.cachedRelatedPoemFullTitle ||
            item.poem?.fullTitle ||
            item.poem?.title ||
            "شعر مرتبط";
          const poetName = item.cachedRelatedPoemPoetName || "";
          const excerpt = [item.coupletVerse1, item.coupletVerse2]
            .filter(Boolean)
            .join(" / ");

          if (!href || !relatedId) {
            return null;
          }

          return (
            <li key={item.id}>
              <Link href={href} className="related-poems-link">
                <strong>{title}</strong>
                {poetName && <span>{poetName}</span>}
                {excerpt && <p>{excerpt}</p>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RelatedPoems;
