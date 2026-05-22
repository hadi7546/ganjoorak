"use client";

import { useCallback, useEffect, useState } from "react";
import type { Poem } from "@/types/poem";
import {
  addToHistory,
  getPoemLibraryKey,
  readFavorites,
  readHistory,
  toggleFavorite,
  type PoemLibraryEntry,
} from "@/utils/poemLibrary";

export const usePoemLibrary = (poem: Poem | null) => {
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<PoemLibraryEntry[]>([]);
  const [history, setHistory] = useState<PoemLibraryEntry[]>([]);

  const refresh = useCallback(() => {
    const nextFavorites = readFavorites();
    setFavorites(nextFavorites);
    setFavoriteKeys(new Set(nextFavorites.map((entry) => entry.key)));
    setHistory(readHistory());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!poem?.id) {
      return;
    }

    addToHistory(poem);
    refresh();
  }, [poem?.id, refresh]);

  const poemIsFavorite = poem ? favoriteKeys.has(getPoemLibraryKey(poem)) : false;

  const handleToggleFavorite = useCallback(() => {
    if (!poem) {
      return false;
    }

    toggleFavorite(poem);
    refresh();
    return !poemIsFavorite;
  }, [poem, poemIsFavorite, refresh]);

  return {
    favorites,
    history,
    isFavorite: poemIsFavorite,
    toggleFavorite: handleToggleFavorite,
    refresh,
  };
};
