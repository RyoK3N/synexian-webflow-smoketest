import type { NextConfig } from "next";

/**
 * Webflow Cloud injects BASE_URL at build time (your mount path, e.g. "/webapp").
 * We also expose it to the client as NEXT_PUBLIC_BASE_PATH so client-side fetches
 * can reach API routes correctly when mounted under a base path.
 */
const MOUNT_PATH = process.env.BASE_URL || ""; // e.g. "/webapp"

const nextConfig: NextConfig = {
  basePath: MOUNT_PATH,
  assetPrefix: MOUNT_PATH,
  // Make base path available on the client bundle
  env: {
    NEXT_PUBLIC_BASE_PATH: MOUNT_PATH,
  },
  experimental: {
    // keep defaults suitable for OpenNext Cloudflare
  },
};

export default nextConfig;

// added by Webflow/OpenNext to enable calling getCloudflareContext() in `next dev`
// (keep this line if it already existed in your project)
// @ts-ignore
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
