import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      // Next's default is 1MB, which is already below the existing
      // document-template image-upload cap (5MB, actions/documents.ts) and
      // well below the new Create Application CV cap (10MB original,
      // ~13.3MB once base64-encoded for the outbound webhook payload —
      // though this limit applies to the raw multipart upload from the
      // browser, before that encoding happens).
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
