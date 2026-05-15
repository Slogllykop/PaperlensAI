import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ["canvas", "pdfjs-dist"],
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
