import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ["canvas"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.supabase.co",
            },
        ],
    },
};

export default nextConfig;
