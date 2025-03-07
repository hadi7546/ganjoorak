import axios from 'axios';

const API_BASE_URL = 'https://api.ganjoor.net/api/ganjoor';

/**
 * API service for interacting with the Ganjoor API
 */
const ganjoorApi = {
    /**
     * Fetch a random poem
     * @returns {Promise<Object>} A promise that resolves to a poem object
     */
    getRandomPoem: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/poem/random`);
            return response.data;
        } catch (error) {
            console.error('Error fetching random poem:', error);
            throw error;
        }
    },

    /**
     * Fetch a specific poem by ID
     * @param {number} poemId - The ID of the poem to fetch
     * @returns {Promise<Object>} A promise that resolves to a poem object
     */
    getPoemById: async (poemId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/poem/${poemId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching poem with ID ${poemId}:`, error);
            throw error;
        }
    },

    /**
     * Fetch a list of poets
     * @returns {Promise<Array>} A promise that resolves to an array of poet objects
     */
    getPoets: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/poets`);
            return response.data;
        } catch (error) {
            console.error('Error fetching poets:', error);
            throw error;
        }
    },

    /**
     * Fetch poems by a specific poet
     * @param {number} poetId - The ID of the poet
     * @returns {Promise<Array>} A promise that resolves to an array of poem objects
     */
    getPoemsByPoet: async (poetId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/poet/${poetId}/poems`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching poems by poet with ID ${poetId}:`, error);
            throw error;
        }
    },

    /**
     * Fetch a poem by Hafez for fortune telling (faal)
     * @returns {Promise<Object>} A promise that resolves to a poem object
     */
    getHafezFaal: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/hafez/faal`);
            return response.data;
        } catch (error) {
            console.error('Error fetching Hafez faal:', error);
            throw error;
        }
    }
};

export default ganjoorApi;