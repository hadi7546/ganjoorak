/** @type {import('next').NextConfig} */
const nextConfig = {

    reactStrictMode: true,
    swcMinify: true,

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'api.ganjoor.net',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '7elmsr3m4bc7q4th.public.blob.vercel-storage.com',
                port: '',
                pathname: '/poets/**',
            },
        ],

    },
};

module.exports = nextConfig;