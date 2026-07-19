/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Puppeteer é pesado e usa binários nativos; não deve ser empacotado no bundle do servidor.
  experimental: {
    serverComponentsExternalPackages: ['puppeteer'],
  },
};
export default nextConfig;
