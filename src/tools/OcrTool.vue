<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useToolsStore } from '../stores/tools'

// 动态导入 PaddleOCR.js，避免拖慢首屏
const loadPaddle = () => import('@paddleocr/paddleocr-js')

const store = useToolsStore()
const KEY = 'ocr'

interface OcrState {
  lang: string
}

const persisted = store.getData<OcrState>(KEY, { lang: 'ch' })
const lang = ref(persisted.lang)

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const fileName = ref('')
const status = ref('就绪，选择图片开始')
const progress = ref(0)
const processing = ref(false)
const result = ref('')
const resultVisible = ref(false)
const engineInfo = ref('')
let ocr: any = null
let busy = false

const langs = [
  { id: 'ch', label: '简体中文' },
  { id: 'en', label: '英文' },
  { id: 'chinese_cht', label: '繁体中文' },
  { id: 'japan', label: '日文' },
]

const statusClass = computed(() => {
  if (processing.value) return 'busy'
  if (status.value.includes('完成')) return 'done'
  if (status.value.includes('失败')) return 'err'
  return ''
})

function persist() {
  store.setData(KEY, { lang: lang.value })
}

function pick() {
  fileInput.value?.click()
}

function onInput(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (f) loadFile(f)
}

function loadFile(file: File) {
  if (!file.type.startsWith('image/')) return
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  fileName.value = file.name
  previewUrl.value = URL.createObjectURL(file)
  result.value = ''
  resultVisible.value = false
  status.value = '就绪，点击开始识别'
  progress.value = 0
}

async function getEngine() {
  if (ocr) return ocr
  status.value = '正在载入 OCR 引擎…'
  progress.value = 0.1
  try {
    const { PaddleOCR } = await loadPaddle()
    ocr = await PaddleOCR.create({
      lang: lang.value,
      ocrVersion: 'PP-OCRv5',
      ortOptions: { backend: 'wasm', numThreads: 1, simd: true,wasmPaths:"https://cdn.staticfile.net/onnxruntime-web/1.27.0/" },
    })
    engineInfo.value = 'PP-OCRv5'
    status.value = 'OCR 引擎就绪'
    progress.value = 1
    return ocr
  } catch (err: any) {
    console.error(err)
    status.value = `引擎加载失败：${err?.message ?? '未知错误'}`
    progress.value = 0
    ocr = null
    throw err
  }
}

async function startOcr() {
  if (busy || !previewUrl.value) return
  busy = true
  processing.value = true
  result.value = ''
  resultVisible.value = false
  try {
    const engine = await getEngine()
    status.value = '识别中…'
    progress.value = 0.3
    // 需要真实 Blob，不能用 objectURL 字符串
    const blob = await (await fetch(previewUrl.value)).blob()
    const [res] = await engine.predict(blob)
    progress.value = 1
    const lines = (res?.items ?? [])
      .filter((it: any) => it.text)
      .map((it: any) => it.text)
    result.value = lines.join('\n')
    resultVisible.value = true
    status.value = `识别完成，共 ${lines.length} 行`
  } catch (err: any) {
    console.error(err)
    status.value = `识别失败：${err?.message ?? '未知错误'}`
    result.value = ''
    resultVisible.value = false
  } finally {
    processing.value = false
    busy = false
  }
}

async function copy() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    status.value = '已复制到剪贴板'
  } catch {
    status.value = '复制失败'
  }
}

function download() {
  if (!result.value) return
  const blob = new Blob([result.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ocr-result.txt'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

function clearAll() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  fileName.value = ''
  result.value = ''
  resultVisible.value = false
  status.value = '就绪，选择图片开始'
  progress.value = 0
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  if (ocr) {
    ocr.dispose?.().catch(() => {})
    ocr = null
  }
})
</script>

<template>
  <div class="tool-body ocr-tool">
    <!-- 顶部操作 -->
    <div class="top-bar">
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onInput" />
      <button class="pick-btn" @click="pick">
        <span class="i-mingcute-folder-open-line"></span> 选择图片
      </button>
      <div class="lang">
        <label>识别语言</label>
        <select class="input" :value="lang" @change="lang = ($event.target as HTMLSelectElement).value as string; persist()">
          <option v-for="l in langs" :key="l.id" :value="l.id">{{ l.label }}</option>
        </select>
      </div>
      <button class="btn" :disabled="!previewUrl || processing" @click="startOcr">
        <span class="i-mingcute-scan-line"></span>
        {{ processing ? '识别中…' : '开始识别' }}
      </button>
    </div>

    <!-- 预览 + 结果 -->
    <div class="workspace">
      <div class="preview">
        <div class="panel-head">
          <span class="i-mingcute-photo-album-line"></span> 图片预览
          <b v-if="fileName" class="fname" :title="fileName">{{ fileName }}</b>
        </div>
        <div class="panel-body">
          <img v-if="previewUrl" :src="previewUrl" alt="预览" />
          <div v-else class="ph">
            <span class="i-mingcute-photo-album-line"></span>
            <p>选择图片</p>
            <p class="hint">支持 PNG / JPG / WEBP / BMP 等</p>
          </div>
        </div>
      </div>

      <div class="result">
        <div class="panel-head">
          <span class="i-mingcute-document-line"></span> 识别结果
          <span v-if="engineInfo" class="engine">{{ engineInfo }}</span>
        </div>
        <div class="panel-body">
          <textarea
            v-if="resultVisible"
            v-model="result"
            class="result-area"
            placeholder="识别文字将显示在这里…"
            spellcheck="false"
          ></textarea>
          <div v-else class="ph">
            <span class="i-mingcute-scan-line"></span>
            <p>尚未识别</p>
            <p class="hint">首次使用需下载模型（约 10MB），后续复用缓存</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <div v-if="processing || progress > 0" class="pbar" :class="{ active: processing }">
      <div class="pfill" :style="{ width: Math.max(progress * 100, 4) + '%' }"></div>
    </div>

    <!-- 状态 + 操作 -->
    <div class="status-row">
      <span class="status" :class="statusClass">{{ status }}</span>
      <div class="ops" v-if="resultVisible">
        <button class="mini" @click="copy">
          <span class="i-mingcute-copy-2-line"></span> 复制
        </button>
        <button class="mini" @click="download">
          <span class="i-mingcute-download-line"></span> 下载
        </button>
        <button class="mini danger" @click="clearAll">
          <span class="i-mingcute-close-line"></span> 清空
        </button>
      </div>
    </div>

    <p class="privacy">
      <span class="i-mingcute-lock-line"></span>
      图片仅在本地浏览器处理，不会上传到任何服务器
    </p>
  </div>
</template>

<style scoped>
.ocr-tool { max-width: 860px; }

.top-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  width: 100%;
  flex-wrap: wrap;
}
.pick-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border: 1.5px solid var(--accent-border);
  border-radius: 14px;
  background: var(--accent-bg);
  color: var(--text-h);
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease;
}
.pick-btn:hover { background: var(--pink); color: #fff; }
.pick-btn:active { transform: scale(0.95); }
.pick-btn span { font-size: 17px; }
.lang {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lang label { font-size: 12px; font-weight: 700; color: var(--text-h); }
.lang select { min-width: 140px; padding: 10px 14px; }

.workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
}
.preview, .result {
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-h);
  border-bottom: 1px solid var(--border);
}
.panel-head span { color: var(--pink); font-size: 15px; }
.panel-head .fname {
  margin-left: auto;
  font-weight: 600;
  font-size: 12px;
  color: var(--text);
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.engine {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #2fae7e;
  background: rgba(95, 208, 160, 0.12);
  padding: 2px 10px;
  border-radius: 20px;
}
.panel-body {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background-image: repeating-conic-gradient(#f5f0e0 0% 25%, #fff 0% 50%);
  background-size: 18px 18px;
}
.panel-body img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 10px;
}
.result .panel-body { background: #fff; }
.ph {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text);
  opacity: 0.7;
  font-size: 14px;
  text-align: center;
}
.ph span { font-size: 40px; color: var(--accent); }
.ph p { font-weight: 600; }
.ph .hint { font-size: 12px !important; font-weight: 400 !important; opacity: 0.7; }
.result-area {
  width: 100%;
  min-height: 220px;
  border: none;
  outline: none;
  resize: vertical;
  font: inherit;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-h);
  background: transparent;
}

.pbar {
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.pfill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--pink));
  border-radius: 4px;
  transition: width 0.25s ease;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}
.status {
  font-size: 13px;
  color: var(--text);
  opacity: 0.85;
}
.status.busy { color: #d99b00; font-weight: 600; }
.status.done { color: #2fae7e; font-weight: 600; }
.status.err { color: #e05c7a; font-weight: 600; }
.ops { margin-left: auto; display: flex; gap: 10px; }
.mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.12s ease;
}
.mini:active { transform: scale(0.94); }
.mini span { font-size: 14px; }
.mini.danger { background: #fff; color: #e05c7a; border: 1.5px solid #ffd4de; }
.mini.danger:hover { background: #ffeef2; border-color: #ffb3c5; }

.privacy {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
  opacity: 0.75;
}
.privacy span { color: #5fd0a0; }

@media (max-width: 640px) {
  .workspace { grid-template-columns: 1fr; }
  .ops { margin-left: 0; }
}
</style>
