import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "custom-history-bar.js",
    },
    minify: "esbuild",
    sourcemap: false,
    target: "es2020",
  },
  test: {
    environment: "node",
  },
});
