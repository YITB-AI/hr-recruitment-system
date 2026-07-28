import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Node environment, not jsdom — this initial suite covers backend logic
// (lib/, server/repositories/) only, not React component rendering. Next
// 16's own testing docs note Vitest can't render async Server Components
// anyway (E2E-only for those) — irrelevant here since nothing in this
// suite touches React at all.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globalSetup: ["./vitest.global-setup.ts"],
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    testTimeout: 30_000,
  },
});
