"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChevronUp,
  FaChevronDown,
  FaShare,
  FaPause,
  FaPlay,
  FaStepBackward,
  FaStepForward,
  FaExternalLinkAlt,
  FaBackward,
  FaForward,
  FaSpinner,
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import "../styles/PoemViewer.css";
import type { Poem, PoemRecitation, VerseSync } from "@/types/poem";
import ganjoorApi from "@/api/GanjoorApi";
import Link from "next/link";
import PoetImage from "@/components/PoetImage";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import SharePoemDialog from "@/components/SharePoemDialog";
import { useSettings } from "@/context/SettingsContext";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import { logger } from "@/utils/logger";

const persianNumberFormatter = new Intl.NumberFormat("fa-IR");

const formatPersianNumber = (value: number) =>
  persianNumberFormatter.format(value);

interface PoemViewerProps {
  poem: Poem;
  onNext: (poem?: Poem) => void;
  onPrevious?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isModern?: boolean;
  poetSlug?: string;
  showNext?: boolean;
  isPoetPage?: boolean;
  onTogglePoetInfo?: () => void;
  onOpenFeed?: () => void;
  onOpenFeedLabel?: string;
}

const PoemViewer: React.FC<PoemViewerProps> = ({
  poem,
  onNext,
  onPrevious = () => {},
  isFirst = true,
  isLast = true,
  isModern = true,
  poetSlug,
  showNext = false,
  isPoetPage = false,
  onTogglePoetInfo,
  onOpenFeed,
  onOpenFeedLabel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentRecitationIndex, setCurrentRecitationIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMouseOverPoemText, setIsMouseOverPoemText] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState(0);
  const [verseSync, setVerseSync] = useState<VerseSync[]>([]);
  const [currentHighlightedVerse, setCurrentHighlightedVerse] =
    useState<number>(-1);
  const [isHighlightEnabled, setIsHighlightEnabled] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poemTextRef = useRef<HTMLDivElement>(null);
  const boundaryNavigationUntilRef = useRef(0);
  const lastBoundaryNavigationAtRef = useRef(0);
  const reachedTopAtRef = useRef(0);
  const reachedBottomAtRef = useRef(0);
  const previousScrollTopRef = useRef(0);
  const isAtTopRef = useRef(true);
  const isAtBottomRef = useRef(false);
  const { settings } = useSettings();
  const poemViewerVisibility = settings.poemViewerVisibility;
  const showTitleSection = poemViewerVisibility.titleSection;
  const showTitleBreadcrumbs = poemViewerVisibility.titleBreadcrumbs;
  const { hasNewUpdates, markAsRead } = useUpdateNotification();
  const fullTitleParts = poem.fullTitle
    ? poem.fullTitle.split(" » ").filter((part) => part.trim())
    : [];
  const fullTitleIntermediateParts =
    fullTitleParts.length > 2 ? fullTitleParts.slice(1, -1) : [];
  const currentRecitation = poem.recitations?.[currentRecitationIndex];
  const currentAudioSrc =
    currentRecitation?.mp3Url ||
    currentRecitation?.audioSrc ||
    currentRecitation?.audioSrcUrl ||
    "";

  // Define loading animation variants
  const loadingVariants = {
    hidden: { opacity: 0, y: "-100%" },
    visible: { opacity: 1, y: "0%" },
  };

  // Turn off loading when a new poem arrives
  useEffect(() => {
    setIsLoading(false);
    containerRef.current
      ?.querySelector(".poem-content")
      ?.classList.remove("poem-content--title-hidden");
    if (poemTextRef.current) {
      poemTextRef.current.scrollTop = 0;
    }
    const now = Date.now();
    lastBoundaryNavigationAtRef.current = now;
    boundaryNavigationUntilRef.current = now + 750;
    reachedTopAtRef.current = now;
    reachedBottomAtRef.current = 0;
    previousScrollTopRef.current = 0;
    isAtTopRef.current = true;
    isAtBottomRef.current = false;
    setIsAtTop(true);
    setIsAtBottom(false);

    // Reset recitation index if needed
    if (poem.recitations && poem.recitations.length > 0) {
      if (currentRecitationIndex >= poem.recitations.length) {
        setCurrentRecitationIndex(0);
      }
    }

    // Reset verse sync data when poem changes
    setVerseSync([]);
    setCurrentHighlightedVerse(-1);
  }, [poem.id, poem.recitations]);

  // Fetch verse synchronization data when recitation changes
  useEffect(() => {
    const fetchVerseSync = async () => {
      if (!poem.recitations || poem.recitations.length === 0) {
        setVerseSync([]);
        return;
      }

      const currentRecitation = poem.recitations[currentRecitationIndex];
      if (!currentRecitation || !currentRecitation.inSyncWithText) {
        setVerseSync([]);
        setCurrentHighlightedVerse(-1);
        return;
      }

      try {
        const verseSyncData = await ganjoorApi.getRecitationVerses(
          currentRecitation.id,
        );
        setVerseSync(verseSyncData);
        // Immediately set to highlight first verse (order 1) when sync data loads
        const firstVerse = verseSyncData.find((v) => v.verseOrder === 1);
        if (firstVerse) {
          setCurrentHighlightedVerse(1);
        } else {
          setCurrentHighlightedVerse(-1);
        }
      } catch (error) {
        logger.error("Error fetching verse sync data:", error);
        setVerseSync([]);
        setCurrentHighlightedVerse(-1);
      }
    };

    fetchVerseSync();
  }, [poem.recitations, currentRecitationIndex]);

  // Update highlighted verse based on current audio time
  useEffect(() => {
    if (!verseSync.length) {
      return;
    }

    if (!isPlaying) {
      setCurrentHighlightedVerse(-1);
      return;
    }

    const currentTimeMs = currentTime * 1000;

    // Find the appropriate verse to highlight
    let highlightedVerseIndex = -1;

    // At the very beginning (0-2000ms), always start with verse order 1
    if (currentTimeMs <= 2000) {
      highlightedVerseIndex = 1; // Force first verse
      // keep first verse highlighted briefly at the very beginning
    } else {
      // For other times, find the verse that should be playing
      let selectedVerse = null;

      // Go through verses in order and find the right one
      for (let i = 0; i < verseSync.length; i++) {
        const verse = verseSync[i];
        const nextVerse = verseSync[i + 1];

        if (currentTimeMs >= verse.audioStartMilliseconds) {
          // Check if we're within this verse's time range
          if (!nextVerse || currentTimeMs < nextVerse.audioStartMilliseconds) {
            selectedVerse = verse;
            break;
          }
        }
      }

      if (selectedVerse) {
        highlightedVerseIndex = selectedVerse.verseOrder;
      }
    }

    // Fallback if nothing found
    if (highlightedVerseIndex === -1) {
      const firstVerse =
        verseSync.find((v) => v.verseOrder === 1) || verseSync[0];
      if (firstVerse) {
        highlightedVerseIndex = firstVerse.verseOrder;
        // fallback to the very first verse
      }
    }

    if (highlightedVerseIndex !== currentHighlightedVerse) {
      setCurrentHighlightedVerse(highlightedVerseIndex);
    }
  }, [currentTime, verseSync, isPlaying, currentHighlightedVerse]);

  // Wrapper to handle next action with loading indicator
  const handleNext = useCallback(() => {
    setNavigationDirection(1);
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    // Reset audio states
    setCurrentTime(0);
    setDuration(0);
    setCurrentRecitationIndex(0);
    // Don't set loading state when scrolling through poems
    onNext();
  }, [isPlaying, onNext]);

  const handlePrevious = useCallback(() => {
    setNavigationDirection(-1);
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
    setDuration(0);
    setCurrentRecitationIndex(0);
    onPrevious();
  }, [isPlaying, onPrevious]);

  const chunk = (arr: string[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, (i + 1) * size),
    );
  };

  // Helper functions for wheel handling
  const isScrollNearBottom = () => {
    if (!poemTextRef.current) return false;
    const threshold = 20;
    return (
      poemTextRef.current.scrollHeight -
        poemTextRef.current.scrollTop -
        poemTextRef.current.clientHeight <
      threshold
    );
  };

  const isScrollNearTop = () => {
    if (!poemTextRef.current) return false;
    return poemTextRef.current.scrollTop <= 1;
  };

  // Update useEffect for optimized scrolling behavior
  useEffect(() => {
    const poemTextElement = poemTextRef.current;
    const viewerElement = containerRef.current;
    if (!poemTextElement || !viewerElement) return;

    let touchStartY = 0;
    let touchStartedAtTop = false;
    let touchStartedAtBottom = false;
    const NAVIGATION_COOLDOWN_MS = 950;
    const BOUNDARY_READ_DELAY_MS = 450;
    const SWIPE_TRIGGER_DISTANCE = 80;

    const canNavigate = () => {
      const now = Date.now();
      if (now < boundaryNavigationUntilRef.current) {
        return false;
      }
      if (now - lastBoundaryNavigationAtRef.current < NAVIGATION_COOLDOWN_MS) {
        return false;
      }
      lastBoundaryNavigationAtRef.current = now;
      boundaryNavigationUntilRef.current = now + NAVIGATION_COOLDOWN_MS;
      return true;
    };

    const canLeaveBoundary = (reachedAt: number) => {
      return reachedAt > 0 && Date.now() - reachedAt >= BOUNDARY_READ_DELAY_MS;
    };

    const wheelHandler = (event: WheelEvent) => {
      const atBottom = isScrollNearBottom();
      const atTop = isScrollNearTop();
      const deltaY = event.deltaY;

      if (Math.abs(deltaY) < 8) {
        return;
      }

      if (
        deltaY > 0 &&
        atBottom &&
        !isLast &&
        canLeaveBoundary(reachedBottomAtRef.current) &&
        canNavigate()
      ) {
        handleNext();
      } else if (
        deltaY < 0 &&
        atTop &&
        !isFirst &&
        canLeaveBoundary(reachedTopAtRef.current) &&
        canNavigate()
      ) {
        handlePrevious();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0].clientY;
      touchStartedAtTop = isScrollNearTop();
      touchStartedAtBottom = isScrollNearBottom();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      const diff = touchStartY - touch.clientY;

      if (Math.abs(diff) >= SWIPE_TRIGGER_DISTANCE && canNavigate()) {
        if (
          diff > 0 &&
          touchStartedAtBottom &&
          isScrollNearBottom() &&
          !isLast &&
          canLeaveBoundary(reachedBottomAtRef.current)
        ) {
          handleNext();
        } else if (
          diff < 0 &&
          touchStartedAtTop &&
          isScrollNearTop() &&
          !isFirst &&
          canLeaveBoundary(reachedTopAtRef.current)
        ) {
          handlePrevious();
        }
      }
    };

    viewerElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    viewerElement.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });
    viewerElement.addEventListener("wheel", wheelHandler, { passive: true });

    return () => {
      viewerElement.removeEventListener("touchstart", handleTouchStart);
      viewerElement.removeEventListener("touchend", handleTouchEnd);
      viewerElement.removeEventListener("wheel", wheelHandler);
    };
  }, [poem.id, isFirst, isLast, handleNext, handlePrevious]);

  const openSource = () => {
    // For custom poems, use the fullUrl directly
    if (poem.isCustom) {
      return poem.fullUrl;
    } else {
      // For ganjoor poems, always prepend the ganjoor.net domain
      return `https://offline.ganjoor.net${poem.fullUrl}`;
    }
  };

  // Handle audio playback and navigation
  const toggleAudio = () => {
    if (!audioRef.current || !currentAudioSrc) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsAudioLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setError(null);
        })
        .catch((err) => {
          logger.error("Error playing audio:", err);
          setError("خطا در پخش صدا");
          setIsPlaying(false);
        })
        .finally(() => {
          setIsAudioLoading(false);
        });
    }
  };

  const handleNextRecitation = () => {
    if (
      !poem.recitations ||
      currentRecitationIndex >= poem.recitations.length - 1
    )
      return;
    const wasPlaying = isPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentRecitationIndex(currentRecitationIndex + 1);
    setCurrentTime(0);
    setError(null);
    if (wasPlaying) {
      const playWhenReady = () => {
        if (audioRef.current) {
          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              setError(null);
            })
            .catch((err) => {
              logger.error("Error playing audio:", err);
              setError("خطا در پخش صدا");
              setIsPlaying(false);
            });
        }
      };
      if (audioRef.current) {
        audioRef.current.addEventListener("loadeddata", playWhenReady, {
          once: true,
        });
      }
    }
  };

  const handlePreviousRecitation = () => {
    if (!poem.recitations || currentRecitationIndex <= 0) return;
    const wasPlaying = isPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentRecitationIndex(currentRecitationIndex - 1);
    setCurrentTime(0);
    setError(null);
    if (wasPlaying) {
      const playWhenReady = () => {
        if (audioRef.current) {
          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              setError(null);
            })
            .catch((err) => {
              logger.error("Error playing audio:", err);
              setError("خطا در پخش صدا");
              setIsPlaying(false);
            });
        }
      };
      if (audioRef.current) {
        audioRef.current.addEventListener("loadeddata", playWhenReady, {
          once: true,
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Helper function to get verse class with highlighting
  const getVerseClass = (lineIndexZeroBased: number): string => {
    let className = "verse-line";

    if (settings.showLineNumbers && isModern) {
      className += " verse-line-numbered";
    }

    // verseOrder from API is 1-based, rendered line indices are 0-based
    const lineOrderOneBased = lineIndexZeroBased + 1;
    const shouldHighlight =
      isHighlightEnabled &&
      verseSync.length > 0 &&
      currentHighlightedVerse === lineOrderOneBased;

    if (shouldHighlight) {
      className += " verse-highlighted";
    }

    return className;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || isAudioLoading) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;
    const newTime = percentage * duration;

    // Set loading state while seeking
    setIsAudioLoading(true);

    try {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } catch (error) {
      logger.error("Error seeking audio:", error);
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (
      poem.recitations &&
      currentRecitationIndex < poem.recitations.length - 1
    ) {
      handleNextRecitation();
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((error) => {
              logger.error("Error playing next audio:", error);
              setIsPlaying(false);
            });
        }
      }, 500);
    }
  };

  const handleAudioError = (
    e: React.SyntheticEvent<HTMLAudioElement, Event>,
  ) => {
    logger.error("Audio error:", e.currentTarget.error || e);
    setError("خطا در بارگذاری صدا");
    setIsAudioLoading(false);
    setIsPlaying(false);
  };

  // Format time in MM:SS format
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Auto-play first recitation when poem changes
  useEffect(() => {
    // Reset audio states
    setCurrentTime(0);
    setDuration(0);

    // Only reset if there are no recitations in the new poem
    if (!poem.recitations || poem.recitations.length === 0) {
      setIsPlaying(false);
      setCurrentRecitationIndex(0);
    } else {
      // Keep the current recitation index if possible
      const maxIndex = poem.recitations.length - 1;
      if (currentRecitationIndex > maxIndex) {
        setCurrentRecitationIndex(0);
      }
    }
    setError(null);

    // Try to play the first recitation if available and was playing before
    if (poem.recitations?.length > 0 && audioRef.current && isPlaying) {
      setIsAudioLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setError(null);
        })
        .catch((error) => {
          logger.error("Error auto-playing audio:", error);
          setError("خطا در پخش خودکار صدا");
          setIsPlaying(false);
        })
        .finally(() => {
          setIsAudioLoading(false);
        });
    }
  }, [poem.id]);

  // Reset error when audio source changes
  useEffect(() => {
    setError(null);
    setIsAudioLoading(false);
    setCurrentTime(0);
    setDuration(0);
  }, [currentAudioSrc]);

  useEffect(() => {
    isAtTopRef.current = true;
    isAtBottomRef.current = false;
    setIsAtTop(true);
    setIsAtBottom(false);
    previousScrollTopRef.current = 0;
  }, [poem.id]);

  useEffect(() => {
    const poemElement = poemTextRef.current;
    if (!poemElement) {
      return;
    }

    const thresholdPx = 32;

    const updateScrollEdges = () => {
      const { scrollTop, scrollHeight, clientHeight } = poemElement;
      const maxScrollable = scrollHeight - clientHeight;
      const effectiveThreshold = Math.min(
        Math.max(thresholdPx, clientHeight * 0.05),
        64,
      );

      const atTop = scrollTop <= effectiveThreshold;
      const atBottom =
        maxScrollable <= effectiveThreshold ||
        maxScrollable - scrollTop <= effectiveThreshold;

      const now = Date.now();
      if (atTop && reachedTopAtRef.current === 0) {
        reachedTopAtRef.current = now;
      } else if (!atTop) {
        reachedTopAtRef.current = 0;
      }

      if (atBottom && reachedBottomAtRef.current === 0) {
        reachedBottomAtRef.current = now;
      } else if (!atBottom) {
        reachedBottomAtRef.current = 0;
      }

      if (isAtTopRef.current !== atTop) {
        isAtTopRef.current = atTop;
        setIsAtTop(atTop);
      }

      if (isAtBottomRef.current !== atBottom) {
        isAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);
      }

      previousScrollTopRef.current = scrollTop;
    };

    let animationFrameId: number | null = null;

    updateScrollEdges();

    const handleScroll = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        updateScrollEdges();
      });
    };

    poemElement.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      poemElement.removeEventListener("scroll", handleScroll);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [poem.id]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const poemText = poemTextRef.current;
      if (!poemText) return;

      const canScroll = () => poemText.scrollHeight > poemText.clientHeight;

      const isAtBottom = () =>
        poemText.scrollHeight - poemText.scrollTop - poemText.clientHeight < 20;

      const isAtTop = () => poemText.scrollTop === 0;

      // Handle audio controls
      if (poem.recitations && poem.recitations.length > 0) {
        if (
          e.code === "Space" &&
          !(e.target as Element)?.matches("input, textarea")
        ) {
          e.preventDefault();
          toggleAudio();
        } else if (
          e.code === "ArrowLeft" &&
          e.altKey &&
          poem.recitations.length > 1
        ) {
          handlePreviousRecitation();
        } else if (
          e.code === "ArrowRight" &&
          e.altKey &&
          poem.recitations.length > 1
        ) {
          handleNextRecitation();
        }
      }

      // Handle poem navigation and scrolling
      if (e.code === "ArrowDown" || e.code === "ArrowUp") {
        const scrollAmount = 100; // Pixels to scroll per key press

        // If mouse is not over poem text
        if (!isMouseOverPoemText) {
          if (e.code === "ArrowDown" && !isLast) {
            e.preventDefault();
            handleNext();
          } else if (e.code === "ArrowUp" && !isFirst) {
            e.preventDefault();
            handlePrevious();
          }
          return;
        }

        // If mouse is over poem text and content is scrollable
        if (canScroll()) {
          if (e.code === "ArrowDown") {
            if (!isAtBottom()) {
              e.preventDefault();
              poemText.scrollBy({ top: scrollAmount, behavior: "smooth" });
            } else if (!isLast) {
              e.preventDefault();
              handleNext();
            }
          } else if (e.code === "ArrowUp") {
            if (!isAtTop()) {
              e.preventDefault();
              poemText.scrollBy({ top: -scrollAmount, behavior: "smooth" });
            } else if (!isFirst) {
              e.preventDefault();
              handlePrevious();
            }
          }
        } else {
          // If content is not scrollable, move to next/previous poem
          if (e.code === "ArrowDown" && !isLast) {
            e.preventDefault();
            handleNext();
          } else if (e.code === "ArrowUp" && !isFirst) {
            e.preventDefault();
            handlePrevious();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    poem.recitations,
    currentRecitationIndex,
    isPlaying,
    isFirst,
    isLast,
    handleNext,
    handlePrevious,
    isMouseOverPoemText,
  ]);

  const hasNextRecitation =
    poem.recitations && currentRecitationIndex < poem.recitations.length - 1;
  const hasPreviousRecitation = poem.recitations && currentRecitationIndex > 0;
  const hasRecitations = (poem.recitations?.length ?? 0) > 0;
  const isAudioPlayerVisible = hasRecitations;
  const isMinimalPoemView =
    !showTitleSection &&
    !poemViewerVisibility.actionButtons &&
    !poemViewerVisibility.navigationControls &&
    !isAudioPlayerVisible;
  const highlightActive =
    isHighlightEnabled &&
    verseSync.length > 0 &&
    currentHighlightedVerse !== -1;
  const viewerClassName = [
    "poem-viewer",
    isPoetPage ? "poem-viewer--embedded" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const poemContentClassName = [
    "poem-content",
    !showTitleSection ? "poem-content--centered" : "",
    isMinimalPoemView ? "poem-content--minimal" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const poemTextClassName = [
    "poem-text",
    highlightActive ? "highlight-on" : "",
    !isAudioPlayerVisible ? "poem-text--no-audio" : "",
    isMinimalPoemView ? "poem-text--minimal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showNavigationControls =
    (isAtTop && !isFirst) || (isAtBottom && !isLast);
  const showActionButtons = isAtTop || isAtBottom;
  const keepPoetProfileVisible =
    isPoetPage && Boolean(onTogglePoetInfo && poem.poet && poem.poetSlug);
  const poetPageHref =
    poem.source === "echolalia"
      ? `/echolalia/${poem.poetSlug}`
      : `/${poem.poetSlug}`;
  if (!poem) return null;

  return (
    <motion.div
      className={viewerClassName}
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MenuButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        hasNotification={hasNewUpdates}
        isHidden={!showActionButtons}
      />
      <SearchButton
        onClick={() => setIsSearchOpen(true)}
        isHidden={!showActionButtons}
      />
      <Menu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        hasNewUpdates={hasNewUpdates}
        onUpdatesViewed={markAsRead}
        onOpenFeed={onOpenFeed}
        onOpenFeedLabel={onOpenFeedLabel}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsMenuOpen(false);
        }}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
      />
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <SharePoemDialog
        poem={poem}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        poetSlug={poetSlug}
      />

      {/* Loading overlay is now permanently hidden when scrolling through poems
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="loading-overlay"
                        variants={loadingVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                    >
                        در حال بارگیری...
                    </motion.div>
                )}
            </AnimatePresence> */}

      {/* Audio player - show only when a recitation is available */}
      {isAudioPlayerVisible && (
        <div className="audio-player">
          <div className="audio-controls">
            <button
              className="audio-control-button"
              onClick={handlePreviousRecitation}
              disabled={!hasPreviousRecitation}
              title="قطعه قبلی"
            >
              <FaBackward />
            </button>
            <button
              className="audio-control-button"
              onClick={toggleAudio}
              disabled={!currentAudioSrc}
              title={isPlaying ? "توقف" : "پخش"}
            >
              {isAudioLoading ? (
                <FaSpinner className="animate-spin" />
              ) : isPlaying ? (
                <FaPause />
              ) : (
                <FaPlay />
              )}
            </button>
            <button
              className="audio-control-button"
              onClick={handleNextRecitation}
              disabled={!hasNextRecitation}
              title="قطعه بعدی"
            >
              <FaForward />
            </button>
            <button
              className={`audio-control-button ${isHighlightEnabled ? "active" : ""}`}
              onClick={() => setIsHighlightEnabled((v) => !v)}
              title={
                isHighlightEnabled
                  ? "خاموش کردن برجسته‌سازی"
                  : "روشن کردن برجسته‌سازی"
              }
            >
              {isHighlightEnabled ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>

          <div className="audio-progress" onClick={handleProgressClick}>
            <div
              className="audio-progress-bar"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          <div className="audio-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <audio
            ref={audioRef}
            src={currentAudioSrc}
            preload="none"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setDuration(audioRef.current.duration);
                setIsAudioLoading(false);
              }
            }}
            onLoadStart={() => {
              if (isPlaying) {
                setIsAudioLoading(true);
              }
            }}
            onCanPlayThrough={() => {
              setIsAudioLoading(false);
            }}
            onSeeking={() => {
              setIsAudioLoading(true);
            }}
            onSeeked={() => {
              setIsAudioLoading(false);
            }}
            onWaiting={() => {
              if (isPlaying) {
                setIsAudioLoading(true);
              }
            }}
            onPlaying={() => {
              setIsAudioLoading(false);
            }}
            onEnded={handleEnded}
            onError={handleAudioError}
          />
        </div>
      )}

      {/* Poem content */}
      <div className={poemContentClassName}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={poem.id}
            className="poem-navigation-frame"
            initial={{
              opacity: 0,
              y: navigationDirection >= 0 ? 28 : -28,
              filter: "blur(3px)",
            }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              y: navigationDirection >= 0 ? -18 : 18,
              filter: "blur(2px)",
            }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            {showTitleSection && (
              <motion.div
                className="title-section"
                style={{
                  width: "100%",
                  maxWidth: "min(92vw, 760px)",
                  marginInline: "auto",
                  paddingInline: "12px",
                  boxSizing: "border-box",
                }}
              >
                <motion.h2
                  className="poem-title"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontSize: "clamp(1.45rem, 4.2vw, 2.25rem)",
                    lineHeight: 1.18,
                    maxWidth: "100%",
                    marginInline: "auto",
                  }}
                >
                  {poem.title}
                </motion.h2>
                {!isPoetPage && (
                  <motion.div
                    className="poet-line"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    style={{
                      fontSize: "clamp(0.85rem, 2.4vw, 1rem)",
                      lineHeight: 1.45,
                      maxWidth: "100%",
                    }}
                  >
                    <span className="poet-name">
                      {poem.poet}
                      {showTitleBreadcrumbs &&
                        fullTitleIntermediateParts.length > 0 && (
                          <span>
                            {"، " + fullTitleIntermediateParts.join("، ")}
                          </span>
                        )}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
            <div key={poem.id} className={poemTextClassName} ref={poemTextRef}>
              {isModern ? (
                <motion.div
                  className="modern-poem"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {poem.plainText.split("\n").map((line, index) => {
                    return (
                      <div key={index} className={getVerseClass(index)}>
                        {settings.showLineNumbers && (
                          <span className="verse-number">{index + 1}</span>
                        )}
                        <span className="verse-text">{line}</span>
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                chunk(
                  poem.plainText.split("\n").filter((line) => line.trim()),
                  2,
                ).map((pair, index) => (
                  <motion.div
                    key={index}
                    className={`verse-pair ${
                      settings.showLineNumbers ? "verse-pair-numbered" : ""
                    }`}
                    data-couplet-number={
                      settings.showLineNumbers
                        ? formatPersianNumber(index + 1)
                        : undefined
                    }
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {pair.map((line, lineIndex) => {
                      const globalLineIndex = index * 2 + lineIndex;
                      return (
                        <div
                          key={lineIndex}
                          className={getVerseClass(globalLineIndex)}
                        >
                          <span className="verse-text">{line}</span>
                        </div>
                      );
                    })}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      {poemViewerVisibility.actionButtons && (
        <div
          className={`action-buttons${keepPoetProfileVisible ? " action-buttons--profile-persistent" : ""}${showActionButtons ? "" : " is-hidden"}`}
        >
          <button
            className="action-button"
            onClick={() => setIsShareOpen(true)}
            title="اشتراک‌گذاری"
          >
            <FaShare />
          </button>
          <a
            href={openSource()}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button"
            title="مشاهده منبع"
            aria-label="مشاهده منبع"
          >
            <FaExternalLinkAlt />
          </a>
          {poem.poet &&
            poem.poetSlug &&
            (isPoetPage && onTogglePoetInfo ? (
              <button
                type="button"
                onClick={onTogglePoetInfo}
                className="poet-profile"
                aria-label={`نمایش اطلاعات ${poem.poet}`}
                title={`نمایش اطلاعات ${poem.poet}`}
              >
                <div className="poet-image-container">
                  <PoetImage
                    imgUrl={poem.poetImageUrl}
                    alt={poem.poet}
                    width={60}
                    height={60}
                  />
                </div>
                <h3 className="poet-profile-name">{poem.poet}</h3>
              </button>
            ) : (
              <Link
                href={poetPageHref}
                className="poet-profile"
                prefetch
                aria-label={`مشاهده اشعار ${poem.poet}`}
                title={`مشاهده اشعار ${poem.poet}`}
              >
                <div className="poet-image-container">
                  <PoetImage
                    imgUrl={poem.poetImageUrl}
                    alt={poem.poet}
                    width={60}
                    height={60}
                  />
                </div>
                <h3 className="poet-profile-name">{poem.poet}</h3>
              </Link>
            ))}
        </div>
      )}

      {/* Navigation controls */}
      {poemViewerVisibility.navigationControls && (
        <div
          className={`navigation-controls${
            showNavigationControls ? "" : " is-hidden"
          }`}
        >
          {!isFirst && (
            <button className="nav-button up" onClick={handlePrevious}>
              <FaChevronUp />
            </button>
          )}
          {!isLast && (
            <button className="nav-button down" onClick={handleNext}>
              <FaChevronDown />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Function to extract poet name from fullTitle
const getPoetName = (fullTitle: string): string => {
  const parts = fullTitle.split(" » ");
  return parts[0];
};

export default PoemViewer;
