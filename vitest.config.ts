import { defineConfig } from "vitest/config";

// Unit tests for the pure business logic in src/lib. These functions (brand
// extraction, filter parsing, price/size/name normalization) encode the rules we
// keep editing and are where regressions actually hide.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
