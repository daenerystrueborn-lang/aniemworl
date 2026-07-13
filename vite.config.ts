import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 8043,
    host: "0.0.0.0",
    proxy: {
      "/api": { target: "https://animeastral.qzz.io", changeOrigin: true, secure: false },
      "/uploads": { target: "https://animeastral.qzz.io", changeOrigin: true, secure: false },
    },
  },
  preview: { port: 8183, host: "0.0.0.0" },
});
