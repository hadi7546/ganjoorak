import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronUp, FaChevronDown, FaHeart, FaShare, FaPause, FaPlay, FaStepBackward, FaStepForward, FaExternalLinkAlt, FaBackward, FaForward } from 'react-icons/fa';
import '../styles/PoemViewer.css';
import type { Poem, PoemRecitation } from '@/types/poem';

interface PoemViewerProps {
    poem: Poem;
    onNext: (poem?: Poem) => void;
    onPrevious: () => void;
    isFirst: boolean;
    isLast: boolean;
}

const PoemViewer: React.FC<PoemViewerProps> = ({ poem, onNext, onPrevious, isFirst, isLast }) => {
    const [liked, setLiked] = useState(false);
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

    // Wrapper to handle next action with loading indicator
    const handleNext = () => {
        setIsLoading(true);
        onNext();
    };

    // Handle swipe gestures and mouse wheel navigation
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            const touchStartY = e.touches[0].clientY;
            const handleTouchMove = (e: TouchEvent) => {
                const touchCurrentY = e.touches[0].clientY;
                const diff = touchStartY - touchCurrentY;
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && !isLast) {
                        // Swipe up - trigger next with loading
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

        const container = containerRef.current;
        if (container) {
            container.addEventListener('touchstart', handleTouchStart);
            // Add mouse wheel navigation:
            const handleWheel = (event: WheelEvent) => {
                event.preventDefault();
                if (event.deltaY > 0 && !isLast) {
                    handleNext();
                } else if (event.deltaY < 0 && !isFirst) {
                    onPrevious();
                }
            };
            container.addEventListener('wheel', handleWheel);
            return () => {
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('wheel', handleWheel);
            };
        }
    }, [isFirst, isLast, onPrevious]);

    // Handle like action
    const toggleLike = () => {
        setLiked(!liked);
    };

    // Handle share action
    const sharePoem = async () => {
        const poemUrl = `https://ganjoor.net${poem.fullUrl}`;
        const shareText = `${poem.title}\n${poemUrl}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: poem.title,
                    text: poem.plainText,
                    url: poemUrl
                });
            } catch (error) {
                console.error('Error sharing:', error);
                // Fallback to clipboard
                copyToClipboard(shareText);
            }
        } else {
            // Fallback to clipboard
            copyToClipboard(shareText);
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
        setCurrentRecitationIndex(currentRecitationIndex + 1);
        setCurrentTime(0);
    };

    const handlePreviousRecitation = () => {
        if (!poem.recitations || currentRecitationIndex <= 0) return;
        setCurrentRecitationIndex(currentRecitationIndex - 1);
        setCurrentTime(0);
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
                    audioRef.current.play();
                    setIsPlaying(true);
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
            audioRef.current.play().catch(error => {
                console.error('Error auto-playing audio:', error);
                setError('خطا در پخش خودکار صدا. لطفاً دوباره تلاش کنید.');
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
                        >
                            <FaBackward />
                        </button>
                        <button 
                            className="audio-control-button"
                            onClick={toggleAudio}
                        >
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </button>
                        <button 
                            className="audio-control-button"
                            onClick={handleNextRecitation}
                            disabled={!hasNextRecitation}
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
                <motion.h2 
                    className="poem-title"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {poem.title}
                </motion.h2>
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
                <button
                    className={`action-button ${isPlaying ? 'playing' : ''}`}
                    onClick={toggleAudio}
                    disabled={!poem.recitations?.length}
                    title={poem.recitations?.length ? (isPlaying ? 'Pause' : 'Play') : 'No audio available'}
                >
                    {isPlaying ? <FaPause /> : <FaPlay />}
                </button>
                <button
                    className={`action-button ${liked ? 'liked' : ''}`}
                    onClick={toggleLike}
                >
                    <FaHeart />
                </button>
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

            {/* Poet info */}
            <div className="poet-info">
                <div className="poet-name">{getPoetName(poem.fullTitle)}</div>
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