import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // No setupFiles - integration tests need real fetch, not mocked
    testTimeout: 120000,
    include: ["tests/integration/**/*.integration.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "./tests"),
    },
  },
});
