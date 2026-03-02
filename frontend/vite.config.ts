import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, ".env") });

const vitePort = process.env.VITE_PORT ? Number(process.env.VITE_PORT) : 5173;

export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      target: "react",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    cors: false,
    port: vitePort,
    proxy: {
      "/api/auth": {
        changeOrigin: true,
        target: process.env.VITE_BACKEND_URL ?? "http://localhost:3000",
      },
    },
  },
});
