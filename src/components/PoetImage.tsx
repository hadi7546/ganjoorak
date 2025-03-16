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
            width={90}
            height={100}
            className="poet-image"
            style={{ objectFit: 'contain' }}
            priority
        />
    );
} 