'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface PoetImageProps {
    imgUrl: string;
    alt?: string;
    poetSlug?: string;
    priority?: boolean;
    onLoadingComplete?: () => void;
}

export default function PoetImage({
    imgUrl,
    alt,
    poetSlug,
    priority = false,
    onLoadingComplete
}: PoetImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(imgUrl);
    const [error, setError] = useState(false);

    // Update imgSrc if imgUrl prop changes
    useEffect(() => {
        setImgSrc(imgUrl);
        setError(false);
    }, [imgUrl]);

    const fallbackImage = '/poet-placeholder.png';

    return (
        <Image
            src={error ? fallbackImage : imgSrc}
            alt={alt || ''}
            width={80}
            height={80}
            className="poet-image"
            style={{ objectFit: 'cover' }}
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
            onError={() => {
                console.error(`Failed to load image: ${imgSrc}`);
                setError(true);
            }}
            onLoadingComplete={() => {
                if (onLoadingComplete) onLoadingComplete();
            }}
            sizes="(max-width: 480px) 50px, (max-width: 768px) 60px, 80px"
            unoptimized={imgSrc.includes('api.ganjoor.net')}
        />
    );
} 