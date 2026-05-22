"use client";

import { useEffect, useMemo, useState } from "react";
import ganjoorApi from "@/api/GanjoorApi";
import type { GanjoorGeoLocation } from "@/types/ganjoor";
import type { Poet } from "@/types/poet";
import { logger } from "@/utils/logger";

interface PoetGeoMapProps {
  poet: Poet;
  rootCategoryId?: number;
}

const formatMapEmbedUrl = (locations: GanjoorGeoLocation[]) => {
  if (locations.length === 0) {
    return null;
  }

  const primary = locations[0];
  const delta = locations.length > 1 ? 2.5 : 0.35;
  const left = Math.min(...locations.map((item) => item.longitude)) - delta;
  const right = Math.max(...locations.map((item) => item.longitude)) + delta;
  const bottom = Math.min(...locations.map((item) => item.latitude)) - delta;
  const top = Math.max(...locations.map((item) => item.latitude)) + delta;

  const markers = locations
    .map((location) => `${location.latitude},${location.longitude}`)
    .join("|");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${markers}`;
};

const PoetGeoMap = ({ poet, rootCategoryId }: PoetGeoMapProps) => {
  const [geoTags, setGeoTags] = useState<Awaited<
    ReturnType<typeof ganjoorApi.getCategoryGeoTags>
  >>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rootCategoryId || poet.source !== "ganjoor") {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const tags = await ganjoorApi.getCategoryGeoTags(rootCategoryId);
        if (!cancelled) {
          setGeoTags(tags);
        }
      } catch (error) {
        logger.error("Failed to load poet geo tags:", error);
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
  }, [poet.source, rootCategoryId]);

  const locations = useMemo(
    () => ganjoorApi.uniqueGeoLocations(geoTags, poet),
    [geoTags, poet],
  );

  const mapUrl = formatMapEmbedUrl(locations);

  if (!mapUrl && !poet.birthPlace && !poet.deathPlace) {
    return null;
  }

  return (
    <section className="poet-geo-section" aria-label="مکان‌های شاعر">
      <h3 className="poet-info-section-title">مکان‌ها</h3>
      <ul className="poet-geo-list">
        {poet.birthPlace && (
          <li>
            <span>زادگاه</span>
            <strong>{poet.birthPlace}</strong>
          </li>
        )}
        {poet.deathPlace && (
          <li>
            <span>آرامگاه</span>
            <strong>{poet.deathPlace}</strong>
          </li>
        )}
        {locations
          .filter((location) => location.id > 0)
          .slice(0, 6)
          .map((location) => (
            <li key={location.id}>
              <span>مکان در اشعار</span>
              <strong>{location.name}</strong>
            </li>
          ))}
      </ul>
      {loading && <p className="poet-geo-status">در حال بارگذاری نقشه...</p>}
      {mapUrl && (
        <iframe
          title={`نقشه ${poet.nickname || poet.name}`}
          src={mapUrl}
          className="poet-geo-map"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </section>
  );
};

export default PoetGeoMap;
