import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // Evita empacotar client Prisma desatualizado no bundle do Turbopack
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
