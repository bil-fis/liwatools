import type { CategoryDef, ToolDef } from './types'
import JsonTool from './JsonTool.vue'
import TimestampTool from './TimestampTool.vue'
import Base64Tool from './Base64Tool.vue'
import StopwatchTool from './StopwatchTool.vue'
import RandomTool from './RandomTool.vue'
import ColorTool from './ColorTool.vue'
import ImageBatchTool from './ImageBatchTool.vue'
import DocBatchTool from './DocBatchTool.vue'
import ImageCompressTool from './ImageCompressTool.vue'
import OcrTool from './OcrTool.vue'

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
    component: JsonTool,
    desc: '美化 / 校验 JSON 文本',
    category: 'dev',
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    icon: 'time-line',
    component: TimestampTool,
    desc: 'Unix 时间戳与日期互转',
    category: 'dev',
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    icon: 'code-line',
    component: Base64Tool,
    desc: '文本与 Base64 互相转换',
    category: 'dev',
  },
  {
    id: 'random',
    name: '随机数生成',
    icon: 'hashtag-line',
    component: RandomTool,
    desc: '生成批量随机整数/小数，支持去重与排序',
    category: 'dev',
  },
  {
    id: 'stopwatch',
    name: '秒表 · 倒计时',
    icon: 'time-line',
    component: StopwatchTool,
    desc: '正向计时与倒计时，结束自动响铃',
    category: 'dev',
  },
  {
    id: 'image-batch',
    name: '图片批量转换',
    icon: 'photo-album-line',
    component: ImageBatchTool,
    desc: '批量转换图片格式（PNG / JPG / WEBP）',
    category: 'convert',
  },
  {
    id: 'doc-batch',
    name: '文档批量转换',
    icon: 'file-line',
    component: DocBatchTool,
    desc: '批量转换文档格式（待实现）',
    category: 'convert',
  },
  {
    id: 'color',
    name: '颜色转换',
    icon: 'palette-line',
    component: ColorTool,
    desc: 'HEX / RGB / RGBA 互转（支持透明度）',
    category: 'color',
  },
  {
    id: 'image-compress',
    name: '图片压缩',
    icon: 'file-zip-line',
    component: ImageCompressTool,
    desc: '纯前端压缩图片体积，保护隐私',
    category: 'image',
  },
  {
    id: 'ocr',
    name: '图片文字提取',
    icon: 'scan-line',
    component: OcrTool,
    desc: 'PaddleOCR 本地识别图片文字',
    category: 'image',
  },
]