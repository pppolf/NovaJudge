import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
    proxyClientMaxBodySize: "1gb",
  },
  serverExternalPackages: ["mathjax-full", "rehype-mathjax"],
};

export default nextConfig;
