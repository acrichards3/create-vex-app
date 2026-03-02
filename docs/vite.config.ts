import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const srcPath = new URL("./src", import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": srcPath,
    },
  },
  server: {
    port: 8000, // keep separate from frontend (5173)
  },
});
