/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    images: {
        domains: ['imgs.deltafood.me', 'deltafoodpicture.sgp1.digitaloceanspaces.com']
    },
    outputFileTracingRoot: path.join(__dirname),
    serverRuntimeConfig: {
        COMET_API_KEY: process.env.COMET_API_KEY,
        COMET_API_URL: process.env.COMET_API_URL,
        COMET_MODEL: process.env.COMET_MODEL,
    },
}

module.exports = nextConfig
