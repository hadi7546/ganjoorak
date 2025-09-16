const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.ganjoor.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "7elmsr3m4bc7q4th.public.blob.vercel-storage.com",
        port: "",
        pathname: "/poets/**",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

module.exports = nextConfig;
