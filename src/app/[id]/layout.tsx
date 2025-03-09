import { Metadata } from 'next'
import ganjoorApi from '@/api/ganjoorApi'

type Props = {
    params: { id: string }
    children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const poem = await ganjoorApi.getPoemById(parseInt(params.id))
        return {
            title: poem.title,
            description: poem.plainText.split('\n')[0], // First line of the poem as description
        }
    } catch (error) {
        return {
            title: 'گنجورک',
            description: 'یک تجربه مینیمال از شنیدن و خواندن شعر.',
        }
    }
}

export default function Layout({ children }: Props) {
    return children
}