/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    images: {
        domains: ['imgs.deltafood.me', 'deltafoodpicture.sgp1.digitaloceanspaces.com']
    },
    outputFileTracingRoot: path.join(__dirname)
}

module.exports = nextConfig
