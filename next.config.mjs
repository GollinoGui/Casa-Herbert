/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // A Cloudflare não otimiza imagem de graça: as fotos saem direto do Supabase Storage.
    unoptimized: true,
    // Fotos enviadas pelo painel (bucket público 'site-images' do Supabase Storage).
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  experimental: {
    // Upload de foto do painel passa por Server Action (padrão do Next é 1 MB).
    serverActions: { bodySizeLimit: "4.5mb" },
    // Volta a uma seção recém-aberta sem ir ao servidor. As actions chamam
    // revalidatePath, que limpa esse cache, então nada fica desatualizado após salvar.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
