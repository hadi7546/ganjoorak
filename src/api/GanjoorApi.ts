import axios from 'axios';
import type { Poem, PoemRecitation } from '@/types/poem';

const API_BASE_URL = 'https://api.ganjoor.net';

const ganjoorApi = {
    async getRandomPoem(): Promise<Poem> {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/ganjoor/poem/random`, {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            return ganjoorApi.mapPoemResponse(response.data);
        } catch (error) {
            console.error('Error fetching random poem:', error);
            throw new Error('خطا در دریافت شعر تصادفی');
        }
    },

    async getPoemById(id: number): Promise<Poem> {
        try {
            // Validate ID before making request
            if (isNaN(id) || id < 1) {
                throw new Error('شناسه شعر نامعتبر است');
            }

            console.log('Fetching poem:', id);
            const response = await axios.get(`${API_BASE_URL}/api/ganjoor/poem/${id}`, {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log('API Response:', response.data);
            return ganjoorApi.mapPoemResponse(response.data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('API Error:', error.response?.data);
                if (error.response?.status === 404) {
                    throw new Error(`شعر با شناسه ${id} پیدا نشد`);
                }
                throw new Error('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید');
            }
            throw error;
        }
    },

    mapPoemResponse(data: any): Poem {
        if (!data || !data.id) {
            throw new Error('شعر یافت نشد');
        }

        // Map recitations to our type if available
        const recitations: PoemRecitation[] = data.recitations?.map((rec: any) => ({
            id: rec.id,
            poemId: rec.poemId,
            poemFullTitle: rec.poemFullTitle,
            poemFullUrl: rec.poemFullUrl,
            audioTitle: rec.audioTitle,
            audioArtist: rec.audioArtist,
            audioArtistUrl: rec.audioArtistUrl,
            audioSrc: rec.audioSrc,
            audioSrcUrl: rec.audioSrcUrl,
            legacyAudioGuid: rec.legacyAudioGuid,
            mp3FileCheckSum: rec.mp3FileCheckSum,
            mp3SizeInBytes: rec.mp3SizeInBytes,
            publishDate: rec.publishDate,
            fileLastUpdated: rec.fileLastUpdated,
            mp3Url: rec.mp3Url,
            xmlText: rec.xmlText,
            // Apply half-space fixing to plainText in recitations
            plainText: rec.plainText,
            htmlText: rec.htmlText,
            mistakes: rec.mistakes || [],
            audioOrder: rec.audioOrder,
            recitationType: rec.recitationType,
            inSyncWithText: rec.inSyncWithText,
            upVotedByUser: rec.upVotedByUser
        })) || [];

        const getPoetName = (fullTitle: string): string => {
            const parts = fullTitle.split(' » ');
            return parts[0];
        };

        return {
            id: data.id,
            title: data.title || 'Unknown Title',
            fullTitle: data.fullTitle || '',
            urlSlug: data.urlSlug || '',
            fullUrl: data.fullUrl || '',
            plainText: data.plainText,
            htmlText: data.htmlText || '',
            recitations: recitations,
            poet: getPoetName(data.fullTitle)
        };
    }
};

export default ganjoorApi;