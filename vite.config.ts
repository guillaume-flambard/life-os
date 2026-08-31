import { defineConfig } from "vite";

// Tauri expects a fixed dev port and no clearing of the screen so Rust logs show.
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
