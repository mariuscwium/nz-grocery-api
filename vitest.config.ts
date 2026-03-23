import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: {
        statements: 85,
        branches: 70,
        functions: 85,
        lines: 85,
      },
      exclude: ["**/*.config.*", "tests/**", "twins/**", "supabase/**", "scripts/**", "src/scraper/fetch.ts"],
    },
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
