import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
<<<<<<< HEAD
    alias: { "@": path.resolve(import.meta.dirname, "src") },
=======
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
<<<<<<< HEAD
    proxy: {
      "/api": { target: "https://animeastral.qzz.io", changeOrigin: true, secure: false },
      "/uploads": { target: "https://animeastral.qzz.io", changeOrigin: true, secure: false },
    },
  },
  preview: { port: 4173, host: "0.0.0.0" },
=======
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
});
