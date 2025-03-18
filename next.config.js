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
                hostname: 'ganjgah.ir',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'iranganje.ir',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i.ibb.co',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '7elmsr3m4bc7q4th.public.blob.vercel-storage.com',
                port: '',
                pathname: '/**',
            },
        ],

    },
};

module.exports = nextConfig;