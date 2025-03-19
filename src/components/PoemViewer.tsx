import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronUp, FaChevronDown, FaHeart, FaShare, FaPause, FaPlay, FaStepBackward, FaStepForward, FaExternalLinkAlt, FaBackward, FaForward, FaInfoCircle, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import '../styles/PoemViewer.css';
import type { Poem, PoemRecitation } from '@/types/poem';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PoetSlug, poetNames } from '@/types/poet';
import PoetImage from '@/components/PoetImage';
import Menu, { MenuButton } from '@/components/Menu';

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
    isPoetPage = false
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [currentRecitationIndex, setCurrentRecitationIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isMouseOverPoemText, setIsMouseOverPoemText] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const poemTextRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [imageLoaded, setImageLoaded] = useState(false);

    // Define loading animation variants
    const loadingVariants = {
        hidden: { opacity: 0, y: '-100%' },
        visible: { opacity: 1, y: '0%' }
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
    }, [poem.id, poem.recitations]);

    // Check if scroll is at the bottom
    const isScrolledToBottom = () => {
        if (!poemTextRef.current) return true;

        const threshold = 50; // Increased threshold for better detection
        return poemTextRef.current.scrollHeight - poemTextRef.current.scrollTop - poemTextRef.current.clientHeight < threshold;
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
        return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
    };

    // Helper functions for wheel handling
    const isAtBottom = () => {
        if (!poemTextRef.current) return false;
        const threshold = 20;
        return poemTextRef.current.scrollHeight - poemTextRef.current.scrollTop - poemTextRef.current.clientHeight < threshold;
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
        const WHEEL_COOLDOWN = 200; // milliseconds - reduced from 500ms for faster response

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

        poemTextElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        poemTextElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        poemTextElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        poemTextElement.addEventListener('wheel', wheelHandler, { passive: false });

        return () => {
            poemTextElement.removeEventListener('touchstart', handleTouchStart);
            poemTextElement.removeEventListener('touchmove', handleTouchMove);
            poemTextElement.removeEventListener('touchend', handleTouchEnd);
            poemTextElement.removeEventListener('wheel', wheelHandler);
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
    }
    // Handle share action
    const sharePoem = async () => {
        const baseUrl = 'https://ganjoorak.ir';
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
                    url: poemUrl
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            copyToClipboard(poemUrl);
        }
    };


    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setToastMessage('لینک شعر کپی شد');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy:', err);
                setToastMessage('خطا در کپی کردن لینک');
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
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    setError(null);
                })
                .catch(err => {
                    console.error('Error playing audio:', err);
                    setError('خطا در پخش صدا');
                    setIsPlaying(false);
                })
                .finally(() => {
                    setIsAudioLoading(false);
                });
        }
    };

    const handleNextRecitation = () => {
        if (!poem.recitations || currentRecitationIndex >= poem.recitations.length - 1) return;
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
                    audioRef.current.play()
                        .then(() => {
                            setIsPlaying(true);
                            setError(null);
                        })
                        .catch(err => {
                            console.error('Error playing audio:', err);
                            setError('خطا در پخش صدا');
                            setIsPlaying(false);
                        });
                }
            };
            if (audioRef.current) {
                audioRef.current.addEventListener('loadeddata', playWhenReady, { once: true });
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
                    audioRef.current.play()
                        .then(() => {
                            setIsPlaying(true);
                            setError(null);
                        })
                        .catch(err => {
                            console.error('Error playing audio:', err);
                            setError('خطا در پخش صدا');
                            setIsPlaying(false);
                        });
                }
            };
            if (audioRef.current) {
                audioRef.current.addEventListener('loadeddata', playWhenReady, { once: true });
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
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
            console.error('Error seeking audio:', error);
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        } finally {
            setIsAudioLoading(false);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        if (poem.recitations && currentRecitationIndex < poem.recitations.length - 1) {
            handleNextRecitation();
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play().then(() => {
                        setIsPlaying(true);
                    }).catch(error => {
                        console.error('Error playing next audio:', error);
                        setIsPlaying(false);
                    });
                }
            }, 500);
        }
    };

    const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
        console.error('Audio error:', e);
        setError('خطا در بارگذاری صدا');
        setIsPlaying(false);
    };

    // Format time in MM:SS format
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    setError(null);
                })
                .catch(error => {
                    console.error('Error auto-playing audio:', error);
                    setError('خطا در پخش خودکار صدا');
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

            const canScroll = () => {
                return poemText.scrollHeight > poemText.clientHeight;
            };

            const isAtBottom = () => {
                const threshold = 20;
                return poemText.scrollHeight - poemText.scrollTop - poemText.clientHeight < threshold;
            };

            const isAtTop = () => {
                return poemText.scrollTop === 0;
            };

            // Handle audio controls
            if (poem.recitations && poem.recitations.length > 0) {
                if (e.code === 'Space' && !(e.target as Element)?.matches('input, textarea')) {
                    e.preventDefault();
                    toggleAudio();
                } else if (e.code === 'ArrowLeft' && e.altKey && poem.recitations.length > 1) {
                    handlePreviousRecitation();
                } else if (e.code === 'ArrowRight' && e.altKey && poem.recitations.length > 1) {
                    handleNextRecitation();
                }
            }

            // Handle poem navigation and scrolling
            if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
                const scrollAmount = 100; // Pixels to scroll per key press

                // If mouse is not over poem text
                if (!isMouseOverPoemText) {
                    if (e.code === 'ArrowDown' && !isLast) {
                        e.preventDefault();
                        handleNext();
                    } else if (e.code === 'ArrowUp' && !isFirst) {
                        e.preventDefault();
                        onPrevious();
                    }
                    return;
                }

                // If mouse is over poem text and content is scrollable
                if (canScroll()) {
                    if (e.code === 'ArrowDown') {
                        if (!isAtBottom()) {
                            e.preventDefault();
                            poemText.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                        } else if (!isLast) {
                            e.preventDefault();
                            handleNext();
                        }
                    } else if (e.code === 'ArrowUp') {
                        if (!isAtTop()) {
                            e.preventDefault();
                            poemText.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
                        } else if (!isFirst) {
                            e.preventDefault();
                            onPrevious();
                        }
                    }
                } else {
                    // If content is not scrollable, move to next/previous poem
                    if (e.code === 'ArrowDown' && !isLast) {
                        e.preventDefault();
                        handleNext();
                    } else if (e.code === 'ArrowUp' && !isFirst) {
                        e.preventDefault();
                        onPrevious();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [poem.recitations, currentRecitationIndex, isPlaying, isFirst, isLast, onPrevious, isMouseOverPoemText]);

    const hasNextRecitation = poem.recitations && currentRecitationIndex < poem.recitations.length - 1;
    const hasPreviousRecitation = poem.recitations && currentRecitationIndex > 0;

    // Preload poet image
    useEffect(() => {
        if (poem.poetImageUrl) {
            const img = new Image();
            img.src = poem.poetImageUrl;
            img.onload = () => setImageLoaded(true);
        }
    }, [poem.poetImageUrl]);

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

            {/* Audio player */}
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
                            title={isPlaying ? 'توقف' : 'پخش'}
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
                    <h2
                        className="poem-title"
                    >
                        {poem.title}
                    </h2>
                    {!isPoetPage && (
                        <div
                            className="poet-name"
                        >
                            {poem.poet}
                        </div>
                    )}
                </div>
                <div
                    className="poem-text"
                    ref={poemTextRef}
                    onMouseEnter={() => setIsMouseOverPoemText(true)}
                    onMouseLeave={() => setIsMouseOverPoemText(false)}
                >
                    {isModern ? (
                        <motion.div
                            className="modern-poem"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {poem.plainText.split('\n').map((line, index) => (
                                <div key={index} className="verse-line">
                                    {line}
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        chunk(poem.plainText.split('\n').filter(line => line.trim()), 2).map((pair, index) => (
                            <motion.div
                                key={index}
                                className="verse-pair"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                {pair.map((line, lineIndex) => (
                                    <div key={lineIndex} className="verse-line">
                                        {line}
                                    </div>
                                ))}
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
                            priority={true}
                            onLoadingComplete={() => setImageLoaded(true)}
                        />
                    </div>
                    <h3 className="poet-profile-name">{poem.poet}</h3>
                </div>
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

            {showToast && (
                <div className="toast-message">
                    {toastMessage}
                </div>
            )}
        </motion.div>
    );
};

// Function to extract poet name from fullTitle
const getPoetName = (fullTitle: string): string => {
    const parts = fullTitle.split(' » ');
    return parts[0];
};

export default PoemViewer;