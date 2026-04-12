/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14.2+: external packages for server components (keeps pdf-parse out of webpack bundle)
  serverExternalPackages: ['pdf-parse'],
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });
    // Prevent webpack from trying to process canvas (required by pdf.js internally)
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
