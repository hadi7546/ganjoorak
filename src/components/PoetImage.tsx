'use client';

import Image from 'next/image';
import { useState } from 'react';

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



    return (
        <Image
            src={imgSrc}
            alt={alt || ''}
            width={width}
            height={height}
            className="poet-image"
            style={{ objectFit: 'cover' }}
            priority
        />
    );
} 