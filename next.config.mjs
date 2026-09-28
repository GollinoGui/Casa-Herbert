/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Fotos enviadas pelo painel (bucket público 'site-images' do Supabase Storage).
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  experimental: {
    // Upload de foto do painel passa por Server Action (padrão do Next é 1 MB).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
