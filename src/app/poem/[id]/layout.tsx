import { Metadata } from 'next'
import ganjoorApi from '@/api/GanjoorApi'

type Props = {
    params: { id: string }
    children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const poem = await ganjoorApi.getPoemById(parseInt(params.id))
        return {
            title: "گنجورک",
            description: poem.fullTitle, // First line of the poem as description
        }
    } catch (error) {
        return {
            title: 'گنجورک',
            description: 'یک تجربه راحت از شنیدن و خواندن شعر.',
        }
    }
}

export default function Layout({ children }: Props) {
    return children
}