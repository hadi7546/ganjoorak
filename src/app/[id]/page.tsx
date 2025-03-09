import { Metadata } from 'next';
import ganjoorApi from '@/api/ganjoorApi';
import { Poem } from '@/types/poem';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const poemId = parseInt(params.id);
    const poem = await ganjoorApi.getPoemById(poemId);

    return {
        title: poem.title,
        description: poem.title,
    };
}

export default async function PoemPage({ params }: { params: { id: string } }) {
    const poemId = parseInt(params.id);
    const poem = await ganjoorApi.getPoemById(poemId);

    return (
        <div>
            <h1>{poem.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: poem.htmlText }} />
        </div>
    );
}
