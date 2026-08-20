import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'liwatools 小工具集合',
        short_name: 'liwatools',
        description: '二次元可爱风格的小工具集合',
        theme_color: '#2f7bff',
        background_color: '#f3f8ff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
      },
    }),
    legacy({
      // 目标老旧浏览器（含 IE11），由 core-js 自动注入所需 polyfill
      targets: ['defaults', '> 0.2%', 'last 2 versions', 'Firefox ESR', 'not dead', 'ie >= 11'],
      // async/await、generator 需要 regenerator-runtime
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  server: {
    host: '0.0.0.0',
  },
})
