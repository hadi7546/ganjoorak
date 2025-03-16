'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Poet } from '@/types/poet';

interface PoetImageProps {
    poetSlug: string;
    alt?: string;
}

export default function PoetImage({ poetSlug, alt }: PoetImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(`https://api.ganjoor.net/api/ganjoor/poet/image/${poetSlug}.png`);

    return (
        <Image
            src={imgSrc}
            alt={alt || poetSlug}
            width={90}
            height={100}
            className="poet-image"
            style={{ objectFit: 'contain' }}
            priority
        />
    );
} 