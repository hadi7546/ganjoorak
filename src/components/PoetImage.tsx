'use client';

import Image from 'next/image';
import { useState } from 'react';

interface PoetImageProps {
    imgUrl: string;
    alt?: string;
}

export default function PoetImage({ imgUrl, alt }: PoetImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(imgUrl);

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