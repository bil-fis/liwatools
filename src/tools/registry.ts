import { defineAsyncComponent, type Component } from 'vue'
import type { CategoryDef, ToolDef } from './types'

/** 加载占位：二次元可爱风 */
const LoadingComp: Component = {
  template:
    '<div style="padding:56px;text-align:center;color:#9aa8c4;font-size:14px;"><i class="i-mingcute-loading-line"></i> 少女祈祷中…</div>',
}
/** 加载失败占位 */
const ErrorComp: Component = {
  template:
    '<div style="padding:56px;text-align:center;color:#e5484d;font-size:14px;">加载失败，请刷新页面 (╥﹏╥)</div>',
}

/** 懒加载包装：切到该工具时才加载对应 chunk */
const lazy = (loader: () => Promise<{ default: Component }>): Component =>
  defineAsyncComponent({
    loader,
    loadingComponent: LoadingComp,
    errorComponent: ErrorComp,
    delay: 120,
    timeout: 20000,
  })

/** 分类顺序即侧栏展示顺序 */
export const categories: CategoryDef[] = [
  { id: 'dev', name: '开发工具类', icon: 'code-line' },
  { id: 'convert', name: '文件转换类', icon: 'refresh-2-line' },
  { id: 'color', name: '设计辅助类', icon: 'palette-line' },
  { id: 'image', name: '图像处理类', icon: 'photo-album-line' },
]

export const tools: ToolDef[] = [
  {
    id: 'json',
    name: 'JSON 格式化',
    icon: 'brackets-line',
    component: lazy(() => import('./JsonTool.vue')),
    desc: '美化 / 校验 JSON 文本',
    category: 'dev',
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    icon: 'time-line',
    component: lazy(() => import('./TimestampTool.vue')),
    desc: 'Unix 时间戳与日期互转',
    category: 'dev',
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    icon: 'code-line',
    component: lazy(() => import('./Base64Tool.vue')),
    desc: '文本与 Base64 互相转换',
    category: 'dev',
  },
  {
    id: 'random',
    name: '随机数生成',
    icon: 'hashtag-line',
    component: lazy(() => import('./RandomTool.vue')),
    desc: '生成批量随机整数/小数，支持去重与排序',
    category: 'dev',
  },
  {
    id: 'stopwatch',
    name: '秒表 · 倒计时',
    icon: 'time-line',
    component: lazy(() => import('./StopwatchTool.vue')),
    desc: '正向计时与倒计时，结束自动响铃',
    category: 'dev',
  },
  {
    id: 'markdown',
    name: 'Markdown 编辑器',
    icon: 'edit-line',
    component: lazy(() => import('./MarkdownTool.vue')),
    desc: '实时预览的 Markdown 编辑与导出',
    category: 'dev',
  },
  {
    id: 'image-batch',
    name: '图片批量转换',
    icon: 'photo-album-line',
    component: lazy(() => import('./ImageBatchTool.vue')),
    desc: '批量转换图片格式（PNG / JPG / WEBP）',
    category: 'convert',
  },
  {
    id: 'doc-batch',
    name: '文档批量转换',
    icon: 'file-line',
    component: lazy(() => import('./DocBatchTool.vue')),
    desc: '批量转换文档格式（待实现）',
    category: 'convert',
  },
  {
    id: 'color',
    name: '颜色转换',
    icon: 'palette-line',
    component: lazy(() => import('./ColorTool.vue')),
    desc: 'HEX / RGB / RGBA 互转（支持透明度）',
    category: 'color',
  },
  {
    id: 'image-compress',
    name: '图片压缩',
    icon: 'file-zip-line',
    component: lazy(() => import('./ImageCompressTool.vue')),
    desc: '纯前端压缩图片体积，保护隐私',
    category: 'image',
  },
  {
    id: 'ocr',
    name: '图片文字提取',
    icon: 'scan-line',
    component: lazy(() => import('./OcrTool.vue')),
    desc: 'PaddleOCR 本地识别图片文字',
    category: 'image',
  },
]
