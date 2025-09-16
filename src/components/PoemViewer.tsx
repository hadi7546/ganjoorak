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
import { useRouter } from "next/navigation";
import { PoetSlug, poetNames } from "@/types/poet";
import PoetImage from "@/components/PoetImage";
import Menu, { MenuButton } from "@/components/Menu";

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
  onPrevious = () => {},
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
  const [verseSync, setVerseSync] = useState<VerseSync[]>([]);
  const [currentHighlightedVerse, setCurrentHighlightedVerse] =
    useState<number>(-1);
  const [isHighlightEnabled, setIsHighlightEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poemTextRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadingVariants = {
    hidden: { opacity: 0, y: "-100%" },
    visible: { opacity: 1, y: "0%" },
  };

  useEffect(() => {
    setIsLoading(false);

    if (poem.recitations && poem.recitations.length > 0) {
      if (currentRecitationIndex >= poem.recitations.length) {
        setCurrentRecitationIndex(0);
      }
    }

    setVerseSync([]);
    setCurrentHighlightedVerse(-1);
  }, [poem.id, poem.recitations]);

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

  useEffect(() => {
    if (!verseSync.length) {
      return;
    }

    if (!isPlaying) {
      setCurrentHighlightedVerse(-1);
      return;
    }

    const currentTimeMs = currentTime * 1000;

    let highlightedVerseIndex = -1;

    if (currentTimeMs <= 2000) {
      highlightedVerseIndex = 1;
    } else {
      let selectedVerse = null;

      for (let i = 0; i < verseSync.length; i++) {
        const verse = verseSync[i];
        const nextVerse = verseSync[i + 1];

        if (currentTimeMs >= verse.audioStartMilliseconds) {
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

    if (highlightedVerseIndex === -1) {
      const firstVerse =
        verseSync.find((v) => v.verseOrder === 1) || verseSync[0];
      if (firstVerse) {
        highlightedVerseIndex = firstVerse.verseOrder;
      }
    }

    if (highlightedVerseIndex !== currentHighlightedVerse) {
      setCurrentHighlightedVerse(highlightedVerseIndex);
    }
  }, [currentTime, verseSync, isPlaying, currentHighlightedVerse]);

  const isScrolledToBottom = () => {
    if (!poemTextRef.current) return true;

    const threshold = 50;
    return (
      poemTextRef.current.scrollHeight -
        poemTextRef.current.scrollTop -
        poemTextRef.current.clientHeight <
      threshold
    );
  };

  const handleNext = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
    setDuration(0);
    setCurrentRecitationIndex(0);
    onNext();
  };

  const chunk = (arr: string[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, (i + 1) * size),
    );
  };

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

  useEffect(() => {
    const poemTextElement = poemTextRef.current;
    if (!poemTextElement) return;

    let wheelTimeout: NodeJS.Timeout | null = null;
    let lastWheelTime = 0;
    const WHEEL_COOLDOWN = 150;

    const wheelHandler = (e: WheelEvent) => {
      const atBottom = isAtBottom();
      const atTop = isAtTop();

      const isSignificantScroll = Math.abs(e.deltaY) > 5;

      const now = Date.now();
      if (now - lastWheelTime < WHEEL_COOLDOWN) {
        return;
      }

      if (atBottom && e.deltaY > 0 && !isLast && isSignificantScroll) {
        e.preventDefault();
        handleNext();
        lastWheelTime = now;
        return;
      }

      if (atTop && e.deltaY < 0 && !isFirst && isSignificantScroll) {
        e.preventDefault();
        onPrevious();
        lastWheelTime = now;
        return;
      }
    };

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
    if (poem.isCustom) {
      return poem.fullUrl;
    } else {
      return `https://ganjoor.net${poem.fullUrl}`;
    }
  };

  const sharePoem = async () => {
    const baseUrl = "https://ganjoorak.ir";
    let poemUrl = "";

    if (poem.isCustom) {
      if (poetSlug) {
        poemUrl = `${baseUrl}/${poetSlug}/${poem.id}`;
      } else if (poem.poetSlug) {
        poemUrl = `${baseUrl}/${poem.poetSlug}/${poem.id}`;
      } else {
        poemUrl = `${baseUrl}/poem/${poem.id}`;
      }
    } else {
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

  const getVerseClass = (lineIndexZeroBased: number): string => {
    let className = "verse-line";

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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);

    if (!poem.recitations || poem.recitations.length === 0) {
      setIsPlaying(false);
      setCurrentRecitationIndex(0);
    } else {
      const maxIndex = poem.recitations.length - 1;
      if (currentRecitationIndex > maxIndex) {
        setCurrentRecitationIndex(0);
      }
    }
    setError(null);

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

  useEffect(() => {
    setError(null);
  }, [poem.recitations, currentRecitationIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const poemText = poemTextRef.current;
      if (!poemText) return;

      const canScroll = () => poemText.scrollHeight > poemText.clientHeight;

      const isAtBottom = () =>
        poemText.scrollHeight - poemText.scrollTop - poemText.clientHeight < 20;

      const isAtTop = () => poemText.scrollTop === 0;

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

      if (e.code === "ArrowDown" || e.code === "ArrowUp") {
        const scrollAmount = 100;

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
      <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)} />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

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
        </div>
        <div
          className={`poem-text ${
            isHighlightEnabled &&
            verseSync.length > 0 &&
            currentHighlightedVerse !== -1
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
                className="verse-pair"
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
      </div>

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
        <div
          className="poet-profile"
          onClick={() => {
            if (poem.poet && poem.poetSlug) {
              router.push(`/${poem.poetSlug}`);
            }
          }}
          role="button"
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
        </div>
      </div>

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

const getPoetName = (fullTitle: string): string => {
  const parts = fullTitle.split(" » ");
  return parts[0];
};

export default PoemViewer;
