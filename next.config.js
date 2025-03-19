/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,

    // Enable compression for better performance
    compress: true,

    // Optimize font loading
    optimizeFonts: true,

    // Improve image loading with sharp
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
        // Optimize image loading
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60,
        deviceSizes: [50, 60, 80, 96, 128, 256, 384, 512, 640, 750, 828, 1080, 1200],
    },

    // Optimize asset loading
    assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,

    // Improve compile-time optimization
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // Enable experimental features for better performance
    experimental: {
        optimizeCss: true,
        scrollRestoration: true,
        optimisticClientCache: true,
    },

    // Webpack optimization
    webpack: (config, { dev, isServer }) => {
        // Optimize production builds
        if (!dev && !isServer) {
            // Split chunks for better caching
            config.optimization.splitChunks.chunks = 'all';

            // Minimize main thread work
            config.optimization.runtimeChunk = 'single';
        }

        return config;
    },
};

module.exports = nextConfig;