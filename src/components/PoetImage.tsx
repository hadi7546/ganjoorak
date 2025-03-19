'use client';

import Image from 'next/image';
import { useState } from 'react';

interface PoetImageProps {
    imgUrl: string;
    alt?: string;
    poetSlug?: string;
    priority?: boolean;
}

export default function PoetImage({ imgUrl, alt, poetSlug, priority = false }: PoetImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(imgUrl);
    const [error, setError] = useState(false);

    return (
        <Image
            src={imgSrc}
            alt={alt || ''}
            width={80}
            height={80}
            className="poet-image"
            style={{ objectFit: 'cover' }}
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
            onError={() => {
                setError(true);
                // You could set a fallback image here if needed
            }}
            sizes="(max-width: 480px) 50px, (max-width: 768px) 60px, 80px"
        />
    );
} 