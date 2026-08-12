import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `unzipper` usa APIs nativas de Node e possui integrações opcionais que o
  // Turbopack tentaria resolver mesmo sem uso. Mantê-lo externo evita incluir
  // caminhos opcionais (como S3) no bundle da rota do motor TSE.
  serverExternalPackages: ['unzipper'],
};

export default nextConfig;
