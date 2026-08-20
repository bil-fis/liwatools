// uno.config.ts
import {defineConfig, presetUno, presetIcons, transformerVariantGroup} from 'unocss'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function extractIconsFromFile(filePath: string): string[] {
    const fullPath = path.resolve(process.cwd(), filePath)
    try {
        const content = fs.readFileSync(fullPath, 'utf-8')
        const regex = /icon\s*:\s*['"]([^'"]+)['"]/g
        const icons: string[] = []
        let match: RegExpExecArray | null
        while ((match = regex.exec(content)) !== null) {
            icons.push(match[1])
        }
        // 只返回去重后的原始图标名（不加前缀）
        return [...new Set(icons)]
    } catch (error) {
        console.warn(`[uno.config] 无法读取文件 ${fullPath}，请检查路径。`)
        console.warn(error)
        return []
    }
}

// 提取图标名并统一加上 'i-mingcute-' 前缀
const iconList = extractIconsFromFile('src/tools/registry.ts')
    .map(name => `i-mingcute-${name}`)

export default defineConfig({
    presets: [
        presetUno(),
        presetIcons({
            warn: true,
            scale: 1.2,
            extraProperties: {
                display: 'inline-block',
                'vertical-align': 'middle',
            },
        }),
    ],
    safelist: iconList,  // 例如 ['i-mingcute-code-line', ...]
    transformers: [transformerVariantGroup()],
})