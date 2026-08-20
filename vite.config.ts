import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import {VitePWA} from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'
import {execSync} from "node:child_process";
import * as crypto from "node:crypto";
import {compression} from 'vite-plugin-compression2'

function getGitShortHash() {
    try {
        return execSync('git rev-parse --short HEAD', {encoding: 'utf-8'}).trim()
    } catch (e) {
        return null
    }
}

function getBuildFallbackHash() {
    return crypto.createHash('sha256').update(new Date().toLocaleString()).digest('hex').slice(0, 8)
}

const gitHash = getGitShortHash()
const buildversion = gitHash ?? getBuildFallbackHash()

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        UnoCSS(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
                name: '晚晚工具箱',
                short_name: '晚晚工具箱',
                description: '随便做的工具合集，解决了找不到工具的问题（划掉）',
                theme_color: '#2f7bff',
                background_color: '#f3f8ff',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {src: 'pwa-192.png', sizes: '192x192', type: 'image/png'},
                    {src: 'pwa-512.png', sizes: '512x512', type: 'image/png'},
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
        compression(
            {
                include: /\.wasm$/,
                algorithms: ['brotliCompress'],
                threshold: 0,
                deleteOriginalAssets: true,
                skipIfLargerOrEqual: false,
            }
        ),
    ],
    server: {
        host: '0.0.0.0',
    },
    define: {
        __BUILD_TIME__: JSON.stringify(new Date().toLocaleString()),
        __BUILD_REVISION__: JSON.stringify(buildversion),
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
        __BUILD_TIME_ISO__: JSON.stringify(new Date().toISOString()),
    },
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "opencv-sdk",
                            test: /opencv-js/,
                            priority: 200
                        },
                        {
                            name: "paddleocr-sdk",
                            test: /@paddleocr[\\/]paddleocr-js|onnxruntime-web/,
                            priority: 200
                        },
                        {
                            name: "vendor",
                            test: /[\\/]node_modules[\\/]/,
                            priority: 100
                        },
                    ],
                },
                chunkFileNames: "chunk-[name]-[hash].js"
            },
        },
    },
})
