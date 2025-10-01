"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChevronUp,
  FaChevronDown,
  FaHeart,
  FaShare,
  FaPause,
  FaPlay,
  FaStepBackward,
  FaStepForward,
  FaExternalLinkAlt,
  FaBackward,
  FaForward,
  FaInfoCircle,
  FaSpinner,
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import "../styles/PoemViewer.css";
import type { Poem, PoemRecitation, VerseSync } from "@/types/poem";
import ganjoorApi from "@/api/GanjoorApi";
import Link from "next/link";
import { PoetSlug, poetNames } from "@/types/poet";
import PoetImage from "@/components/PoetImage";
import Menu, { MenuButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import { useSettings } from "@/context/SettingsContext";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";

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
  poetSlug?: PoetSlug;
  showNext?: boolean;
  isPoetPage?: boolean;
}

const PoemViewer: React.FC<PoemViewerProps> = ({
  poem,
  onNext,
  onPrevious = () => { },
  isFirst = true,
  isLast = true,
  isModern = true,
  poetSlug,
  showNext = false,
  isPoetPage = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentRecitationIndex, setCurrentRecitationIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isMouseOverPoemText, setIsMouseOverPoemText] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [verseSync, setVerseSync] = useState<VerseSync[]>([]);
  const [currentHighlightedVerse, setCurrentHighlightedVerse] =
    useState<number>(-1);
  const [isHighlightEnabled, setIsHighlightEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poemTextRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const { hasNewUpdates, markAsRead } = useUpdateNotification();

  // Define loading animation variants
  const loadingVariants = {
    hidden: { opacity: 0, y: "-100%" },
    visible: { opacity: 1, y: "0%" },
  };

  // Turn off loading when a new poem arrives
  useEffect(() => {
    setIsLoading(false);

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
        console.error("Error fetching verse sync data:", error);
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

  // Check if scroll is at the bottom
  const isScrolledToBottom = () => {
    if (!poemTextRef.current) return true;

    const threshold = 50; // Increased threshold for better detection
    return (
      poemTextRef.current.scrollHeight -
      poemTextRef.current.scrollTop -
      poemTextRef.current.clientHeight <
      threshold
    );
  };

  // Wrapper to handle next action with loading indicator
  const handleNext = () => {
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
  };

  const chunk = (arr: string[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, (i + 1) * size),
    );
  };

  // Helper functions for wheel handling
  const isAtBottom = () => {
    if (!poemTextRef.current) return false;
    const threshold = 20;
    return (
      poemTextRef.current.scrollHeight -
      poemTextRef.current.scrollTop -
      poemTextRef.current.clientHeight <
      threshold
    );
  };

  const isAtTop = () => {
    if (!poemTextRef.current) return false;
    return poemTextRef.current.scrollTop <= 1;
  };

  // Update useEffect for optimized scrolling behavior
  useEffect(() => {
    const poemTextElement = poemTextRef.current;
    if (!poemTextElement) return;

    // Debounce mechanism to prevent rapid firing of wheel events
    let wheelTimeout: NodeJS.Timeout | null = null;
    let lastWheelTime = 0;
    const WHEEL_COOLDOWN = 150; // milliseconds - slightly faster response

    // Direct wheel handler with improved logic
    const wheelHandler = (e: WheelEvent) => {
      // Only check if we're at boundaries
      const atBottom = isAtBottom();
      const atTop = isAtTop();

      // Make sure we don't trigger the event too frequently
      const isSignificantScroll = Math.abs(e.deltaY) > 5; // Reduced threshold for better sensitivity

      // Debounce implementation
      const now = Date.now();
      if (now - lastWheelTime < WHEEL_COOLDOWN) {
        return; // Still in cooldown period
      }

      // If we're at the bottom and scrolling down, go to next poem
      if (atBottom && e.deltaY > 0 && !isLast && isSignificantScroll) {
        e.preventDefault();
        handleNext();
        lastWheelTime = now;
        return;
      }

      // If we're at the top and scrolling up, go to previous poem
      if (atTop && e.deltaY < 0 && !isFirst && isSignificantScroll) {
        e.preventDefault();
        onPrevious();
        lastWheelTime = now;
        return;
      }
    };

    // Touch event handlers
    let touchStartY = 0;
    let isTouching = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      isTouching = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching) return;

      const touchCurrentY = e.touches[0].clientY;
      const diff = touchStartY - touchCurrentY;

      // If poem is scrollable, let the user scroll
      if (poemTextElement.scrollHeight > poemTextElement.clientHeight) {
        if ((diff > 0 && !isAtBottom()) || (diff < 0 && !isAtTop())) {
          return;
        }
      }

      if (Math.abs(diff) > 50) {
        if (diff > 0 && !isLast) {
          handleNext();
        } else if (diff < 0 && !isFirst) {
          onPrevious();
        }
        isTouching = false;
      }
    };

    const handleTouchEnd = () => {
      isTouching = false;
    };

    poemTextElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    poemTextElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    poemTextElement.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });
    poemTextElement.addEventListener("wheel", wheelHandler, { passive: false });

    return () => {
      poemTextElement.removeEventListener("touchstart", handleTouchStart);
      poemTextElement.removeEventListener("touchmove", handleTouchMove);
      poemTextElement.removeEventListener("touchend", handleTouchEnd);
      poemTextElement.removeEventListener("wheel", wheelHandler);
    };
  }, [isFirst, isLast, onPrevious, handleNext]);

  const openSource = () => {
    // For custom poems, use the fullUrl directly
    if (poem.isCustom) {
      return poem.fullUrl;
    } else {
      // For ganjoor poems, always prepend the ganjoor.net domain
      return `https://ganjoor.net${poem.fullUrl}`;
    }
  };
  // Handle share action
  const sharePoem = async () => {
    const baseUrl = "https://ganjoorak.ir";
    let poemUrl = "";

    if (poem.isCustom) {
      // For custom poems, share as /[poet]/id
      if (poetSlug) {
        poemUrl = `${baseUrl}/${poetSlug}/${poem.id}`;
      } else if (poem.poetSlug) {
        poemUrl = `${baseUrl}/${poem.poetSlug}/${poem.id}`;
      } else {
        // Fallback to /poem/:id if no poet slug is available
        poemUrl = `${baseUrl}/poem/${poem.id}`;
      }
    } else {
      // For ganjoor poems, share as /poem/:id
      poemUrl = `${baseUrl}/poem/${poem.id}`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${poem.title} | گنجورک`,
          text: `${poem.title} از ${poem.poet} | گنجورک`,
          url: poemUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      copyToClipboard(poemUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setToastMessage("لینک شعر کپی شد");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        setToastMessage("خطا در کپی کردن لینک");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      });
  };

  // Handle audio playback and navigation
  const toggleAudio = () => {
    if (!audioRef.current || isAudioLoading) return;

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
          console.error("Error playing audio:", err);
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
              console.error("Error playing audio:", err);
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
              console.error("Error playing audio:", err);
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
      console.error("Error seeking audio:", error);
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
              console.error("Error playing next audio:", error);
              setIsPlaying(false);
            });
        }
      }, 500);
    }
  };

  const handleAudioError = (
    e: React.SyntheticEvent<HTMLAudioElement, Event>,
  ) => {
    console.error("Audio error:", e);
    setError("خطا در بارگذاری صدا");
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
          console.error("Error auto-playing audio:", error);
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
  }, [poem.recitations, currentRecitationIndex]);

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
            onPrevious();
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
              onPrevious();
            }
          }
        } else {
          // If content is not scrollable, move to next/previous poem
          if (e.code === "ArrowDown" && !isLast) {
            e.preventDefault();
            handleNext();
          } else if (e.code === "ArrowUp" && !isFirst) {
            e.preventDefault();
            onPrevious();
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
    onPrevious,
    isMouseOverPoemText,
  ]);

  const hasNextRecitation =
    poem.recitations && currentRecitationIndex < poem.recitations.length - 1;
  const hasPreviousRecitation = poem.recitations && currentRecitationIndex > 0;

  if (!poem) return null;

  return (
    <motion.div
      className="poem-viewer"
      key={poem.id}
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MenuButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        hasNotification={hasNewUpdates}
      />
      <Menu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        hasNewUpdates={hasNewUpdates}
        onUpdatesViewed={markAsRead}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsMenuOpen(false);
        }}
      />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

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
      {poem.recitations && poem.recitations.length > 0 && (
        <div className="audio-player">
          <div className="audio-controls">
            <button
              className="audio-control-button"
              onClick={handlePreviousRecitation}
              disabled={!hasPreviousRecitation || isAudioLoading}
              title="قطعه قبلی"
            >
              <FaBackward />
            </button>
            <button
              className="audio-control-button"
              onClick={toggleAudio}
              disabled={isAudioLoading}
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
              disabled={!hasNextRecitation || isAudioLoading}
              title="قطعه بعدی"
            >
              <FaForward />
            </button>
            <button
              className={`audio-control-button ${isHighlightEnabled ? "active" : ""}`}
              onClick={() => setIsHighlightEnabled((v) => !v)}
              title={isHighlightEnabled ? "خاموش کردن برجسته‌سازی" : "روشن کردن برجسته‌سازی"}
            >
              {isHighlightEnabled ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>

          <div className="audio-progress" onClick={handleProgressClick}>
            <div
              className="audio-progress-bar"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <div className="audio-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <audio
            ref={audioRef}
            src={poem.recitations[currentRecitationIndex]?.mp3Url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setDuration(audioRef.current.duration);
                setIsAudioLoading(false);
              }
            }}
            onLoadStart={() => {
              setIsAudioLoading(true);
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
              setIsAudioLoading(true);
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
      <div className="poem-content">
        <div className="title-section">
          <motion.h2
            className="poem-title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {poem.title}
          </motion.h2>
          {!isPoetPage && (
            <motion.div
              className="poet-name"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {poem.poet}
            </motion.div>
          )}
          {!isPoetPage && poem.poet && poem.poetSlug && (
            <Link
              href={`/${poem.poetSlug}`}
              prefetch
              className="poet-profile-inline"
              aria-label={`مشاهده اشعار ${poem.poet}`}
              title={`مشاهده اشعار ${poem.poet}`}
            >
              <div className="poet-profile-inline-avatar">
                <PoetImage
                  imgUrl={poem.poetImageUrl}
                  alt={poem.poet}
                  width={44}
                  height={44}
                />
              </div>
              <span className="poet-profile-inline-name">{poem.poet}</span>
            </Link>
          )}
        </div>
        <div
          className={`poem-text ${isHighlightEnabled && verseSync.length > 0 && currentHighlightedVerse !== -1
            ? "highlight-on"
            : ""
            }`}
          ref={poemTextRef}
        >
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {settings.showLineNumbers && (
                  <span className="verse-number verse-number-pair">
                    {formatPersianNumber(index + 1)}
                  </span>
                )}
                <div className="verse-pair-lines">
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
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button
          className="action-button"
          onClick={sharePoem}
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
        {poem.poet && poem.poetSlug && (
          <Link
            href={`/${poem.poetSlug}`}
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
        )}
      </div>

      {/* Navigation controls */}
      <div className="navigation-controls">
        {!isFirst && (
          <button className="nav-button up" onClick={onPrevious}>
            <FaChevronUp />
          </button>
        )}
        {!isLast && (
          <button className="nav-button down" onClick={handleNext}>
            <FaChevronDown />
          </button>
        )}
      </div>

      {showToast && <div className="toast-message">{toastMessage}</div>}
    </motion.div>
  );
};

// Function to extract poet name from fullTitle
const getPoetName = (fullTitle: string): string => {
  const parts = fullTitle.split(" » ");
  return parts[0];
};

export default PoemViewer;
