import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    // Hardhat/Mocha contract tests run separately via `npm run test:contract`
    exclude: ["**/node_modules/**", "test/AcademicVerification.test.cjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["app/**/*.{ts,tsx}"],
      exclude: [
        "app/entry.client.tsx",
        "app/entry.server.tsx",
        "app/root.tsx",
        "app/tailwind.css",
      ],
      // Remix route files contain both server logic (loader/action — tested here)
      // and React UI components (tested via E2E / browser tests in production).
      // Thresholds reflect server-side business logic coverage only.
      thresholds: {
        statements: 50,
        branches: 35,
        functions: 25,
        lines: 50,
      },
    },
  },
});
