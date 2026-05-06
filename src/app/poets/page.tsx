import { Century, Poet } from '@/types/poet';
import ganjoorApi from '@/api/GanjoorApi';
import customApi from '@/api/CustomApi';
import echolaliaApi from '@/api/EcholaliaApi';
import PoetsContent from '@/components/PoetsContent';
import '@/styles/Poets.css';
import { logger } from '@/utils/logger';

export const dynamic = 'force-static';

async function getCenturies(): Promise<Century[]> {
    try {
        const centuries = await ganjoorApi.getCenturies();
        return centuries.sort((a, b) => a.halfCenturyOrder - b.halfCenturyOrder);
    } catch (error) {
        logger.error("Error fetching centuries:", error);
        return [];
    }
}

async function getCustomPoets(): Promise<Poet[]> {
    try {
        logger.log("Fetching custom poets...");
        const poets = await customApi.getPoets();
        logger.log(`Found ${poets.length} custom poets`);
        return poets;
    } catch (error) {
        logger.error("Error fetching custom poets:", error);
        return [];
    }
}

async function getModernPoets(): Promise<Poet[]> {
    try {
        logger.log("Fetching Echolalia poets...");
        const poets = await echolaliaApi.getPoets();
        logger.log(`Found ${poets.length} Echolalia poets`);
        return poets;
    } catch (error) {
        logger.error("Error fetching Echolalia poets:", error);
        return [];
    }
}

export default async function PoetsPage() {
    // Fetch data in parallel for better performance
    const [centuries, customPoets, modernPoets] = await Promise.all([
        getCenturies(),
        getCustomPoets(),
        getModernPoets()
    ]);

    logger.log(`Rendering poets page with ${centuries.length} centuries, ${customPoets.length} custom poets and ${modernPoets.length} modern poets`);

    return (
        <div className="poets-container">
            <h1 className="poets-title">شاعران</h1>
            <PoetsContent centuries={centuries} customPoets={customPoets} modernPoets={modernPoets} />
        </div>
    );
} 
