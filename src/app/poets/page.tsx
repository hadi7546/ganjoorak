import { Vazirmatn } from 'next/font/google';
import { Century, Poet } from '@/types/poet';
import ganjoorApi from '@/api/GanjoorApi';
import customApi from '@/api/CustomApi';
import PoetsContent from '@/components/PoetsContent';
import '@/styles/Poets.css';

const vazirmatn = Vazirmatn({ subsets: ['arabic'] });

async function getCenturies(): Promise<Century[]> {
    const centuries = await ganjoorApi.getCenturies();
    return centuries.sort((a, b) => a.halfCenturyOrder - b.halfCenturyOrder);
}

async function getCustomPoets(): Promise<Poet[]> {
    return await customApi.getPoets();
}

export default async function PoetsPage() {
    const centuries = await getCenturies();
    const customPoets = await getCustomPoets();

    return (
        <div className={`poets-container ${vazirmatn.className}`}>
            <h1 className="poets-title">شاعران</h1>
            <PoetsContent centuries={centuries} customPoets={customPoets} />
        </div>
    );
} 