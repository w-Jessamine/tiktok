import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    alias: {
      "@videopilot/shared": path.resolve(__dirname, "../shared/src/index.ts")
    }
  }
});
