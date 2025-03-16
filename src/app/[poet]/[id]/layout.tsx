import { Metadata } from 'next'
import customApi from '@/api/CustomApi'
import { PoetSlug, poetNames } from '@/types/poet'

type Props = {
    params: { id: string, poet: string }
    children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const poetSlug = params.poet as PoetSlug;
        const poetName = poetNames[poetSlug] || 'شاعر ناشناخته';
        const id = parseInt(params.id);

        if (isNaN(id)) {
            throw new Error('Invalid poem ID');
        }

        const poem = await customApi.getPoemById(id, poetSlug);

        return {
            title: `${poem.title} از ${poetName} | گنجورک`,
            description: poem.plainText.substring(0, 160), // First 160 characters of the poem as description
        }
    } catch (error) {
        return {
            title: 'شعر | گنجورک',
            description: 'یک تجربه بهتر از شنیدن و خواندن شعر فارسی در گنجورک',
        }
    }
}

export default function PoemLayout({ children }: Props) {
    return children
}