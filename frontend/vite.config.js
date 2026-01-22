import { fileURLToPath, URL } from "node:url";
import { defineConfig, splitVendorChunkPlugin } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "fs";
import path from "path";

import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { visualizer } from "rollup-plugin-visualizer";
// import viteCacheValidationPlugin from "./scripts/vite-cache-plugin.js";

import dns from "dns";

dns.setDefaultResultOrder("verbatim");

// Check if premium directories exist
function checkPremiumDirectories() {
  const projectRoot = path.resolve(__dirname, "../..");
  const premiumDirs = [
    "premium-frontend/src/premium",
    "premium-backend/src",
    "premium-libs/src"
  ];
  
  return premiumDirs.every(dir => {
    const fullPath = path.join(projectRoot, dir);
    return fs.existsSync(fullPath);
  });
}

// Determine if we should include premium modules
const hasPremiumModules = checkPremiumDirectories();
const isEEMode = process.env.NODE_ENV === 'ee' || process.env.VUE_APP_EDITION === 'gitmesh-ee' || process.env.EDITION === 'gitmesh-ee';
const includePremiumModules = hasPremiumModules && isEEMode;

console.log(`🔧 Build Configuration:`);
console.log(`   Premium directories available: ${hasPremiumModules ? '✅' : '❌'}`);
console.log(`   EE mode requested: ${isEEMode ? '✅' : '❌'}`);
console.log(`   Including premium modules: ${includePremiumModules ? '✅' : '❌'}`);

export default defineConfig({
  define: {
    "import.meta.env": process.env,
    __PREMIUM_MODULES_AVAILABLE__: includePremiumModules,
  },

  envPrefix: "VUE_APP",

  build: {
    sourcemap: false,
  },

  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'vuex',
      'element-plus',
      '@element-plus/icons-vue',
      'axios',
      'lodash',
      '@vueuse/core',
      'chart.js',
      'moment',
      'socket.io-client',
      'uuid',
      'qs',
      'marked',
      'dompurify',
      'file-saver',
      'papaparse',
      'date-fns',
      '@cubejs-client/core',
      '@cubejs-client/vue3',
      '@tiptap/vue-3',
      '@tiptap/starter-kit',
      '@vuelidate/core',
      '@vuelidate/validators'
    ],
    cacheDir: './node_modules/.vite-cache',
    holdUntilCrawlEnd: true
  },
  plugins: [
    vue(),
    splitVendorChunkPlugin(),
    // viteCacheValidationPlugin({
    //   validateOnStart: true,
    //   rebuildCorrupted: true,
    //   preventLoops: true,
    //   logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'silent'
    // }),
    Components({
      extensions: ["vue"],
      include: [/\.vue$/, /\.vue\?vue/],
      resolvers: [
        ElementPlusResolver({
          importStyle: "css",
        }),
      ],
      dts: "components.d.ts",
    }),
    visualizer({
      template: "treemap",
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "analyse.html",
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "~": fileURLToPath(new URL("./node_modules", import.meta.url)),
      // Add premium module aliases only if available
      ...(includePremiumModules && {
        "@premium": fileURLToPath(new URL("../../premium-frontend/src/premium", import.meta.url)),
      }),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://localhost:8080",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    port: 8081,
    host: true,
  },
});
