import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Must match your Environment's mount path in Webflow Cloud
  basePath: "/webapp",
  assetPrefix: "/webapp",
  trailingSlash: false
};

export default nextConfig;
