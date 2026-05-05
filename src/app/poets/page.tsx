import Link from 'next/link';
import { Poet } from '@/types/poet';
import ganjoorApi from '@/api/GanjoorApi';
import customApi from '@/api/CustomApi';
import '@/styles/Poets.css';

export const dynamic = 'force-dynamic';

async function getGanjoorPoets(): Promise<Poet[]> {
    try {
        const poets = await ganjoorApi.getPoets();
        return poets
            .filter((poet) => poet.published)
            .sort((a, b) => a.pinOrder - b.pinOrder || a.name.localeCompare(b.name, 'fa'));
    } catch (error) {
        console.error("Error fetching Ganjoor poets:", error);
        return [];
    }
}

async function getCustomPoets(): Promise<Poet[]> {
    try {
        const poets = await customApi.getPoets();
        return poets;
    } catch (error) {
        console.error("Error fetching custom poets:", error);
        return [];
    }
}

function getPoetHref(poet: Poet): string {
    const path = poet.fullUrl || poet.urlSlug;
    return path.startsWith('/') ? path : `/${path}`;
}

export default async function PoetsPage() {
    const [ganjoorPoets, customPoets] = await Promise.all([
        getGanjoorPoets(),
        getCustomPoets()
    ]);
    const poets = [...customPoets, ...ganjoorPoets];

    return (
        <div className="poets-container">
            <h1 className="poets-title">شاعران</h1>
            <div className="poets-grid-container open" style={{ height: 'auto' }}>
                <div className="poets-grid">
                    {poets.map((poet, index) => (
                        <Link
                            href={getPoetHref(poet)}
                            key={`${poet.fullUrl || poet.urlSlug || poet.name}-${poet.id}-${index}`}
                            className="poet-card"
                        >
                            <h2 className="poet-name">{poet.nickname || poet.name}</h2>
                            {poet.nickname && <p className="poet-nickname">{poet.name}</p>}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
} 
