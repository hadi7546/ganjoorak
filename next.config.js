const GANJOOR_API_BASE_URL =
    process.env.GANJOOR_API_BASE_URL ||
    process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL ||
    'http://api.offline.ganjoor.net';

const ganjoorApiUrl = new URL(GANJOOR_API_BASE_URL);

/** @type {import('next').NextConfig} */
const nextConfig = {

    reactStrictMode: true,
    swcMinify: true,

    async rewrites() {
        const ganjoorApiBaseUrl = GANJOOR_API_BASE_URL.replace(/\/+$/, '');

        return [
            {
                source: '/api/ganjoor/:path*',
                destination: `${ganjoorApiBaseUrl}/api/ganjoor/:path*`,
            },
            {
                source: '/api/audio/verses/:path*',
                destination: `${ganjoorApiBaseUrl}/api/audio/verses/:path*`,
            },
        ];
    },

    images: {
        remotePatterns: [
            {
                protocol: ganjoorApiUrl.protocol.replace(':', ''),
                hostname: ganjoorApiUrl.hostname,
                port: ganjoorApiUrl.port,
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.ganjoor.net',
                port: '',
                pathname: '/**',
            },
        ],
        minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
        formats: ['image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
};

module.exports = nextConfig;
