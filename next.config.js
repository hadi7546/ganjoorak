/** @type {import('next').NextConfig} */
const nextConfig = {

    reactStrictMode: true,
    swcMinify: true,

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'api.ganjoor.net',
                pathname: '/api/ganjoor/poet/image/**',
            },
        ],
    },
};

module.exports = nextConfig;