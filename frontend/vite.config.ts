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
  },
});
