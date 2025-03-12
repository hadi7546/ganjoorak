import poemsData from '../../poems/nosrat.json';

const customApi = {


    async getRandomPoem(): Promise<any> {
        const poems = poemsData.poems;
        if (!poems || poems.length === 0) {
            throw new Error('No poems available');
        }
        const randomIndex = Math.floor(Math.random() * poems.length);
        const poem = poems[randomIndex];
        // Apply half-space fixing to the poem text
        return poem;
    },

    async getPoemById(id: number): Promise<any> {
        const poems = poemsData.poems;
        const poem = poems.find((p: any) => p.id === id);
        if (!poem) {
            throw new Error(`شعر با شناسه ${id} پیدا نشد`);
        }
        return poem;
    }
};

export default customApi;
