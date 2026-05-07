'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface PoetImageProps {
    imgUrl: string;
    alt?: string;
    poetSlug?: string;
    width?: number;
    height?: number;
}

export default function PoetImage({ imgUrl, alt, poetSlug, width = 60, height = 60 }: PoetImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(imgUrl);
    const [error, setError] = useState(false);

    useEffect(() => {
        setImgSrc(imgUrl || '/images/default-poet.png');
        setError(false);
    }, [imgUrl]);

    const handleError = () => {
        if (error) {
            return;
        }

        setError(true);
        // Fallback to a default image if loading fails
        setImgSrc('/images/default-poet.png');
    };

    return (
        <Image
            src={imgSrc}
            alt={alt || ''}
            width={width}
            height={height}
            className="poet-image"
            style={{ objectFit: 'cover' }}
            key={imgSrc}
            priority={false} // Set priority to false to reduce initial load impact
            onError={handleError}
            loading="lazy"
            quality={75} // Reduce quality slightly to save bandwidth
        />
    );
}
