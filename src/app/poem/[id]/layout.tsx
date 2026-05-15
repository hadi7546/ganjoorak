import { Metadata } from 'next'
import ganjoorApi from '@/api/GanjoorApi'

type Props = {
    params: Promise<{ id: string }>
    children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const { id } = await params
        const poem = await ganjoorApi.getPoemById(parseInt(id))
        return {
            title: "گنجورک",
            description: poem.fullTitle, // First line of the poem as description
        }
    } catch (error) {
        return {
            title: 'گنجورک',
            description: 'یک تجربه بهتر از شنیدن و خواندن شعر فارسی.',
        }
    }
}

export default function Layout({ children }: Props) {
    return children
}