import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // puppeteer-core + @sparticuz/chromium (lib/pdf-conversion.ts) ship native
  // binaries/binary-loading logic that Next's bundler must not try to trace
  // into — they need to stay as plain node_modules requires at runtime.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
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
