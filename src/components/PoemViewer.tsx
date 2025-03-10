import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronUp, FaChevronDown, FaHeart, FaShare, FaPause, FaPlay, FaStepBackward, FaStepForward, FaExternalLinkAlt, FaBackward, FaForward } from 'react-icons/fa';
import '../styles/PoemViewer.css';
import type { Poem, PoemRecitation } from '@/types/poem';
import ganjoorApi from '@/api/GanjoorApi';

interface PoemViewerProps {
    poem: Poem;
    onNext: (poem?: Poem) => void;
    onPrevious: () => void;
    isFirst: boolean;
    isLast: boolean;
}

const PoemViewer: React.FC<PoemViewerProps> = ({ poem, onNext, onPrevious, isFirst, isLast }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentRecitationIndex, setCurrentRecitationIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Define loading animation variants
    const loadingVariants = {
        hidden: { opacity: 0, y: '-100%' },
        visible: { opacity: 1, y: '0%' }
    };

    // Turn off loading when a new poem arrives
    useEffect(() => {
        setIsLoading(false);
    }, [poem.id]);

    // Check if scroll is at the bottom
    const isScrolledToBottom = () => {
        const poemText = document.querySelector('.poem-text');
        if (!poemText) return true;

        const threshold = 50; // Increased threshold for better detection
        return poemText.scrollHeight - poemText.scrollTop - poemText.clientHeight < threshold;
    };
    // Wrapper to handle next action with loading indicator
    const handleNext = () => {
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
        setIsLoading(true);
        onNext();
    };

    // Handle swipe gestures and mouse wheel navigation
    useEffect(() => {
        const poemText = document.querySelector('.poem-text') as HTMLDivElement;
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

        const handleTouchStart = (e: Event) => {
            const touchEvent = e as TouchEvent;
            const touchStartY = touchEvent.touches[0].clientY;

            const handleTouchMove = (e: Event) => {
                const touchEvent = e as TouchEvent;
                const touchCurrentY = touchEvent.touches[0].clientY;
                const diff = touchStartY - touchCurrentY;

                // If poem is scrollable, let the user scroll
                if (canScroll()) {
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
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                }
            };

            const handleTouchEnd = () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            };

            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        };

        const handleWheel = (e: Event) => {
            const wheelEvent = e as WheelEvent;
            const poemTextRect = poemText.getBoundingClientRect();
            const isMouseOverPoemText =
                wheelEvent.clientY >= poemTextRect.top &&
                wheelEvent.clientY <= poemTextRect.bottom;

            if (!isMouseOverPoemText) return;

            // If poem is scrollable, let the user scroll unless at boundaries
            if (canScroll()) {
                if (wheelEvent.deltaY > 0 && !isAtBottom()) {
                    return;
                }
                if (wheelEvent.deltaY < 0 && !isAtTop()) {
                    return;
                }
            }

            // Only navigate if we're at the boundaries
            if (wheelEvent.deltaY > 0 && !isLast) {
                wheelEvent.preventDefault();
                handleNext();
            } else if (wheelEvent.deltaY < 0 && !isFirst) {
                wheelEvent.preventDefault();
                onPrevious();
            }
        };

        poemText.addEventListener('touchstart', handleTouchStart as EventListener);
        poemText.addEventListener('wheel', handleWheel as EventListener);

        return () => {
            poemText.removeEventListener('touchstart', handleTouchStart as EventListener);
            poemText.removeEventListener('wheel', handleWheel as EventListener);
        };
    }, [isFirst, isLast, onPrevious, handleNext]);

    // Handle like action
    // Handle share action
    const sharePoem = async () => {
        const poemUrl = `https://ganjoorak.ir/${poem.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: poem.title,
                    url: poemUrl
                });
            } catch (error) {
                console.error('Error sharing:', error);
                // Fallback to clipboard
                copyToClipboard(poemUrl);
            }
        } else {
            // Fallback to clipboard
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
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
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
        if (wasPlaying) {
            const playWhenReady = () => {
                if (audioRef.current) {
                    audioRef.current.play()
                        .then(() => setIsPlaying(true))
                        .catch(err => {
                            console.error('Error playing audio:', err);
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
        if (wasPlaying) {
            const playWhenReady = () => {
                if (audioRef.current) {
                    audioRef.current.play()
                        .then(() => setIsPlaying(true))
                        .catch(err => {
                            console.error('Error playing audio:', err);
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
        if (!audioRef.current) return;

        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percentage = x / width;
        const newTime = percentage * duration;

        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
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
        setIsPlaying(false);
        setCurrentRecitationIndex(0);
        // Try to play the first recitation if available
        if (poem.recitations?.length > 0 && audioRef.current) {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(error => {
                console.error('Error auto-playing audio:', error);
                setError('خطا در پخش خودکار صدا. لطفاً دوباره تلاش کنید.');
                setIsPlaying(false);
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
            if (!poem.recitations || !poem.recitations.length) return;

            if (e.code === 'Space' && !(e.target as Element)?.matches('input, textarea')) {
                e.preventDefault();
                toggleAudio();
            } else if (e.code === 'ArrowLeft' && e.altKey && poem.recitations.length > 1) {
                handlePreviousRecitation();
            } else if (e.code === 'ArrowRight' && e.altKey && poem.recitations.length > 1) {
                handleNextRecitation();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [poem.recitations, currentRecitationIndex, isPlaying]);

    const chunk = (arr: string[], size: number) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
    };

    const hasNextRecitation = poem.recitations && currentRecitationIndex < poem.recitations.length - 1;
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
            {/* Audio player */}
            {poem.recitations && poem.recitations.length > 0 && poem.recitations[currentRecitationIndex] && (
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
                            title={isPlaying ? 'توقف' : 'پخش'}
                        >
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </button>
                        <button
                            className="audio-control-button"
                            onClick={handleNextRecitation}
                            disabled={!hasNextRecitation}
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
                        src={poem.recitations[currentRecitationIndex].mp3Url}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={() => {
                            if (audioRef.current) {
                                setDuration(audioRef.current.duration);
                            }
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
                    <motion.div
                        className="poet-name"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        {getPoetName(poem.fullTitle)}
                    </motion.div>
                </div>
                <div className="poem-text">
                    {chunk(poem.plainText.split('\n').filter(line => line.trim()), 2).map((pair, index) => (
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
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div className="action-buttons">
                <button className="action-button" onClick={sharePoem}>
                    <FaShare />
                </button>
                <a
                    href={`https://ganjoor.net${poem.fullUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-button"
                    title="مشاهده در وبسایت گنجور"
                    aria-label="مشاهده در وبسایت گنجور"
                >
                    <FaExternalLinkAlt />
                </a>
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
