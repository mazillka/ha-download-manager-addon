import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  root: "frontend",
  base: "./",
  plugins: [vue()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "frontend"),
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },

  build: {
    outDir: "../dist/frontend",
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, "./index.html"),
      output: {
        entryFileNames: "bundle.js",
        manualChunks: {
          vue: ["vue"],
          vendor: ["video.js", "sweetalert2", "bootstrap"],
        },
      },
    },
  },

  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },

  server: {
    port: 3001,
    strictPort: true,

    proxy: {
      "/": "http://localhost:3000",
    },
  },
});
