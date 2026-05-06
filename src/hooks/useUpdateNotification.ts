"use client";

import { useCallback, useEffect, useState } from "react";
import { latestUpdateVersion } from "@/data/updates";
import { logger } from "@/utils/logger";

const STORAGE_KEY = "ganjoorak:lastSeenUpdate";

export const useUpdateNotification = () => {
  const [hasNewUpdates, setHasNewUpdates] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (latestUpdateVersion && stored !== latestUpdateVersion) {
        setHasNewUpdates(true);
      }
    } catch (error) {
      logger.error("Failed to read updates status", error);
    }
  }, []);

  const markAsRead = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      if (latestUpdateVersion) {
        window.localStorage.setItem(STORAGE_KEY, latestUpdateVersion);
      }
      setHasNewUpdates(false);
    } catch (error) {
      logger.error("Failed to mark updates as read", error);
    }
  }, []);

  return { hasNewUpdates, markAsRead, latestUpdateVersion };
};
