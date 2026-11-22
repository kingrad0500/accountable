/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The ports come from the environment so the end-to-end tests can run their
// own servers next to `npm run dev`.
const apiPort = process.env.API_PORT ?? "8000";
const webPort = Number(process.env.WEB_PORT ?? "5173");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: false,
    // The slowest screen tests take about 1.5 s; the default 5 s limit failed them on a busy
    // machine. The limit only catches hangs, so leave plenty of room.
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/test-setup.ts", "src/main.tsx"],
      reporter: ["text-summary", "text"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
