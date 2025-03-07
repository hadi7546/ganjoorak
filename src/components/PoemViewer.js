import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaChevronUp, FaChevronDown, FaHeart, FaShare, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import '../styles/PoemViewer.css';

const PoemViewer = ({ poem, onNext, onPrevious, isFirst, isLast }) => {
    const [liked, setLiked] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [hasAudio, setHasAudio] = useState(false);
    const audioRef = useRef(null);
    const containerRef = useRef(null);

    // Check if the poem has audio recitations
    useEffect(() => {
        if (poem && poem.recitations && poem.recitations.length > 0) {
            setHasAudio(true);
            // Reset audio player when poem changes
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setPlaying(false);
            }
        } else {
            setHasAudio(false);
        }
    }, [poem]);

    // Handle swipe gestures
    useEffect(() => {
        const handleTouchStart = (e) => {
            const touchStartY = e.touches[0].clientY;

            const handleTouchMove = (e) => {
                const touchCurrentY = e.touches[0].clientY;
                const diff = touchStartY - touchCurrentY;

                // Threshold for swipe detection
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && !isLast) {
                        // Swipe up - next poem
                        onNext();
                    } else if (diff < 0 && !isFirst) {
                        // Swipe down - previous poem
                        onPrevious();
                    }

                    // Remove event listeners after swipe is detected
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

            return () => {
                container.removeEventListener('touchstart', handleTouchStart);
            };
        }
    }, [isFirst, isLast, onNext, onPrevious]);

    // Handle audio playback
    const toggleAudio = () => {
        if (!hasAudio || !audioRef.current) return;

        if (playing) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setPlaying(!playing);
    };

    // Handle like action
    const toggleLike = () => {
        setLiked(!liked);
    };

    // Handle share action
    const sharePoem = () => {
        if (navigator.share) {
            navigator.share({
                title: poem.fullTitle,
                text: poem.plainText,
                url: `https://ganjoor.net${poem.fullUrl}`,
            })
                .catch((error) => console.log('Error sharing:', error));
        } else {
            // Fallback for browsers that don't support the Web Share API
            alert(`Copy this link to share: https://ganjoor.net${poem.fullUrl}`);
        }
    };

    if (!poem) return null;

    // Get the first audio recitation if available
    const audioSrc = hasAudio ? poem.recitations[0].mp3Url : null;

    return (
        <motion.div
            className="poem-viewer"
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Audio element */}
            {hasAudio && (
                <audio
                    ref={audioRef}
                    src={audioSrc}
                    onEnded={() => setPlaying(false)}
                />
            )}

            {/* Poem content */}
            <div className="poem-content">
                <h2 className="poem-title">{poem.fullTitle}</h2>
                <div
                    className="poem-text"
                    dangerouslySetInnerHTML={{ __html: poem.htmlText }}
                />
            </div>

            {/* Navigation controls */}
            <div className="navigation-controls">
                {!isFirst && (
                    <button className="nav-button up" onClick={onPrevious}>
                        <FaChevronUp />
                    </button>
                )}
                {!isLast && (
                    <button className="nav-button down" onClick={onNext}>
                        <FaChevronDown />
                    </button>
                )}
            </div>

            {/* Action buttons */}
            <div className="action-buttons">
                <button
                    className={`action-button ${liked ? 'liked' : ''}`}
                    onClick={toggleLike}
                >
                    <FaHeart />
                </button>
                <button className="action-button" onClick={sharePoem}>
                    <FaShare />
                </button>
                {hasAudio && (
                    <button
                        className={`action-button ${playing ? 'playing' : ''}`}
                        onClick={toggleAudio}
                    >
                        {playing ? <FaVolumeUp /> : <FaVolumeMute />}
                    </button>
                )}
            </div>

            {/* Poet info */}
            <div className="poet-info">
                <div className="poet-name">
                    {poem.fullTitle.split('»')[0].trim()}
                </div>
            </div>
        </motion.div>
    );
};

export default PoemViewer;