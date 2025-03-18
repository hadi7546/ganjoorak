'use client';

import Image from 'next/image';
import { useState } from 'react';

interface PoetImageProps {
    imgUrl: string;
    alt?: string;
    poetSlug?: string;
}

export default function PoetImage({ imgUrl, alt, poetSlug }: PoetImageProps) {
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
            priority
        />
    );
} 