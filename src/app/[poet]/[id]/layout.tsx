import { Metadata } from 'next'
import customApi from '@/api/CustomApi'
import { Poet, poetSlugs, isValidPoet } from '@/types/poets'

type Props = {
    params: { id: string, poet: string }
    children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        // Validate the poet parameter first
        if (!isValidPoet(params.poet)) {
            return {
                title: 'گنجورک',
                description: 'یک تجربه بهتر از شنیدن و خواندن شعر.',
            }
        }

        const poet = params.poet as Poet;
        const poemId = parseInt(params.id);

        // Validate the ID
        if (isNaN(poemId) || poemId < 1) {
            return {
                title: 'گنجورک',
                description: 'یک تجربه بهتر از شنیدن و خواندن شعر.',
            }
        }

        const poem = await customApi.getPoemById(poemId, poet);
        return {
            title: "گنجورک",
            description: poem.fullTitle,
        }
    } catch (error) {
        return {
            title: 'گنجورک',
            description: 'یک تجربه بهتر از شنیدن و خواندن شعر.',
        }
    }
}

export default function Layout({ children }: Props) {
    return children
}