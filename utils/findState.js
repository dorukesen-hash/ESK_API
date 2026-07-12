const axios = require('axios');

const findState = async (zip) => {
    try {
        const response = await axios.get(`https://api.zippopotam.us/us/${zip}`);
        const state = response.data?.places?.[0]?.['state abbreviation'];
        if (state) {
            return state;
        } else {
            throw new Error('State not found');
        }
    } catch (error) {
        console.log(error)
        throw new Error(error.response?.status === 404 ? 'Invalid ZIP code' : error.message);
    }
};

module.exports = findState;