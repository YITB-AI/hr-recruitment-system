import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // puppeteer-core + @sparticuz/chromium (lib/pdf-conversion.ts) ship native
  // binaries/binary-loading logic that Next's bundler must not try to trace
  // into — they need to stay as plain node_modules requires at runtime.
  // @napi-rs/canvas (lib/pdf-to-image.ts, via pdfjs-dist's Node canvas
  // factory) ships a prebuilt native .node binary the same way chromium
  // does — kept un-bundled for the same reason.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "@napi-rs/canvas"],
  // serverExternalPackages alone keeps chromium un-bundled, but Next's own
  // output file tracer (@vercel/nft) still decides which files ship in each
  // route's deployed function by static import/require/fs analysis —
  // chromium.executablePath() locates its binary via a dynamic path join at
  // runtime, which the tracer can't see statically. Without this, the
  // route's Lambda is built with node_modules/@sparticuz/chromium/bin
  // entirely missing, and chromium.executablePath() throws "The input
  // directory .../bin does not exist" in production (confirmed via a real
  // failed generation on dax-hr.vercel.app — the deployed function was only
  // ~3.6MB, nowhere near enough to contain the ~50MB+ compressed binary).
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
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
