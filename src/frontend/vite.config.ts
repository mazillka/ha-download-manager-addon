import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import viteCompression from "vite-plugin-compression";

export default defineConfig(({ mode }) => ({
  root: "frontend",
  base: "./",
  plugins: [
    vue(),
    // Gzip compression for production builds
    viteCompression({
      verbose: true,
      disable: mode === "development",
      threshold: 10240, // Only compress files > 10KB
      algorithm: "gzip",
      ext: ".gz",
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "frontend"),
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },

  build: {
    outDir: "../dist/frontend",
    emptyOutDir: true,
    minify: mode === "production" ? "esbuild" : false,
    sourcemap: mode === "development",
    cssCodeSplit: true,
    rollupOptions: {
      input: path.resolve(__dirname, "./index.html"),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks: (id) => {
          // Vendor chunk for node_modules
          if (id.includes("node_modules")) {
            // Separate Vue ecosystem
            if (id.includes("vue") || id.includes("vuetify")) {
              return "vue-vendor";
            }
            // Separate video.js (large library)
            if (id.includes("video.js")) {
              return "video-vendor";
            }
            // Other vendors
            return "vendor";
          }
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },

  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },

  server: {
    port: 3001,
    host: "0.0.0.0",
    strictPort: true,
    open: true,
    proxy: {
      "/api/": "http://localhost:3000",
      "/health/": "http://localhost:3000",
    },
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ["vue", "vuetify", "video.js"],
    exclude: [],
  },
}));
