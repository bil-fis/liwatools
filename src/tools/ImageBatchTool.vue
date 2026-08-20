<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import JSZip from 'jszip'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'image-batch'

interface FileItem {
  id: number
  file: File
  name: string
  size: number
  status: 'pending' | 'converting' | 'done' | 'error'
  outBlob: Blob | null
  outSize: number | null
  error: string | null
  previewUrl: string
}

/** 从 store 恢复数据（含 Blob 引用，内存态不序列化，安全） */
const persisted = store.getData<{ items: FileItem[]; target: TargetFmt; quality: number } | null>(
  KEY,
  null,
)
const items: FileItem[] = reactive(persisted?.items ?? [])
const target = ref<TargetFmt>(persisted?.target ?? 'png')
const quality = ref(persisted?.quality ?? 0.92)

type TargetFmt = 'png' | 'jpg' | 'webp'

const targets: { id: TargetFmt; label: string; icon: string }[] = [
  { id: 'png', label: 'PNG', icon: 'i-mingcute-pic-line' },
  { id: 'jpg', label: 'JPG', icon: 'i-mingcute-pic-2-line' },
  { id: 'webp', label: 'WEBP', icon: 'i-mingcute-pic-fill' },
]

let idCounter = items.reduce((m, i) => Math.max(m, i.id), 0)
const isConverting = ref(false)
const progress = ref(0)
const dragover = ref(false)

// Toast
const toasts = ref<{ id: number; msg: string; type: string }[]>([])
let toastId = 0
function toast(msg: string, type = 'info') {
  const id = ++toastId
  toasts.value.push({ id, msg, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 3200)
}

function persist() {
  store.setData(KEY, { items: JSON.parse(JSON.stringify(items, replacer)), target: target.value, quality: quality.value })
}
// Blob/File 不能 JSON 序列化，转为标记
function replacer(key: string, value: any) {
  if (key === 'file' || key === 'outBlob' || key === 'previewUrl') return undefined
  return value
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i]
}

/** 列表行状态文案 */
function statusText(it: FileItem) {
  switch (it.status) {
    case 'pending':
      return '待转换'
    case 'converting':
      return '转换中…'
    case 'done':
      return '已转换'
    default:
      return '失败'
  }
}

/** 单个文件转换（带提示） */
function convertOne(it: FileItem) {
  convertItem(it)
    .then(() => {
      persist()
      toast(it.name + ' 转换成功', 'success')
    })
    .catch((e: any) => {
      it.status = 'error'
      it.error = e.message
      persist()
      toast('失败：' + e.message, 'error')
    })
}
function baseName(n: string) {
  const d = n.lastIndexOf('.')
  return d > 0 ? n.slice(0, d) : n
}

// 文件输入
const fileInput = ref<HTMLInputElement | null>(null)
function pickFiles() {
  fileInput.value?.click()
}
function onInputChange(e: Event) {
  const f = (e.target as HTMLInputElement).files
  if (f) addFiles(f)
  ;(e.target as HTMLInputElement).value = ''
}
function onDrop(e: DragEvent) {
  dragover.value = false
  if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files)
}
function addFiles(list: FileList) {
  let added = 0
  for (const f of Array.from(list)) {
    if (!f.type.startsWith('image/')) {
      toast(`「${f.name}」不是图片，已跳过`, 'warning')
      continue
    }
    const previewUrl = URL.createObjectURL(f)
    items.push({
      id: ++idCounter,
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending',
      outBlob: null,
      outSize: null,
      error: null,
      previewUrl,
    })
    added++
  }
  if (added) toast(`已添加 ${added} 张图片`, 'success')
  persist()
}

function removeFile(id: number) {
  const idx = items.findIndex((i) => i.id === id)
  if (idx < 0) return
  const it = items[idx]
  if (it.previewUrl) URL.revokeObjectURL(it.previewUrl)
  items.splice(idx, 1)
  persist()
}
function clearAll() {
  items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl))
  items.splice(0)
  progress.value = 0
  persist()
  toast('已清空列表', 'info')
}

// 核心转换
function convertItem(it: FileItem): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(it.file)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')!
        if (target.value === 'jpg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        ctx.drawImage(img, 0, 0)
        const mime = target.value === 'jpg' ? 'image/jpeg' : target.value === 'webp' ? 'image/webp' : 'image/png'
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (!blob) return reject(new Error('编码失败'))
            it.outBlob = blob
            it.outSize = blob.size
            it.status = 'done'
            it.error = null
            resolve()
          },
          mime,
          target.value === 'jpg' ? quality.value : undefined,
        )
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

async function convertAll() {
  if (isConverting.value) return
  const pending = items.filter((i) => i.status !== 'done')
  if (!pending.length) {
    toast('没有需要转换的文件', 'info')
    return
  }
  isConverting.value = true
  progress.value = 0
  let ok = 0
  let fail = 0
  for (let i = 0; i < pending.length; i++) {
    const it = pending[i]
    it.status = 'converting'
    try {
      await convertItem(it)
      ok++
    } catch (err: any) {
      it.status = 'error'
      it.error = err.message
      fail++
      toast(`${it.name} 失败：${err.message}`, 'error')
    }
    progress.value = Math.round(((i + 1) / pending.length) * 100)
    persist()
  }
  isConverting.value = false
  persist()
  toast(`转换完成：成功 ${ok}${fail ? `，失败 ${fail}` : ''}`, fail ? 'warning' : 'success')
}

function downloadOne(it: FileItem) {
  if (!it.outBlob) return
  const url = URL.createObjectURL(it.outBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName(it.name)}.${target.value}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

async function downloadZip() {
  if (isConverting.value) return
  const done = items.filter((i) => i.status === 'done' && i.outBlob)
  if (!done.length) {
    toast('没有已转换的文件', 'warning')
    return
  }
  try {
    const zip = new JSZip()
    done.forEach((i) => zip.file(`${baseName(i.name)}.${target.value}`, i.outBlob!))
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `images_${target.value}_${Date.now()}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
    toast(`已打包 ${done.length} 个文件 (ZIP)`, 'success')
  } catch (e: any) {
    toast('打包失败：' + e.message, 'error')
  }
}

const doneCount = computed(() => items.filter((i) => i.status === 'done').length)
const zipSize = computed(() =>
  items.filter((i) => i.status === 'done').reduce((s, i) => s + (i.outSize ?? 0), 0),
)

onMounted(() => {
  // 恢复时若有卡在转换中的状态，重置为待转换
  items.forEach((i) => {
    if (i.status === 'converting') i.status = 'pending'
  })
})
onBeforeUnmount(() => {
  // 预览 URL 在组件卸载时释放（转换结果 Blob 仍在 store 中保留）
  items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl))
})
</script>

<template>
  <div class="conv">
    <!-- 控制卡片 -->
    <div class="card">
      <div
        class="drop"
        :class="{ over: dragover }"
        @click="pickFiles"
        @dragover.prevent="dragover = true"
        @dragleave.prevent="dragover = false"
        @drop.prevent="onDrop"
      >
        <div class="flex justify-center items-center"><span class="drop-icon i-mingcute-upload-2-line"></span></div>
        <div class="drop-title">拖拽图片到此处，或 <em>点击选择</em></div>
        <div class="drop-hint">支持 PNG / JPG / WEBP 等格式互转</div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          hidden
          @change="onInputChange"
        />
      </div>

      <div class="controls">
        <div class="fmt-group">
          <span class="ctl-label">目标格式</span>
          <div class="chips">
            <button
              v-for="t in targets"
              :key="t.id"
              class="chip"
              :class="{ on: target === t.id }"
              @click="target = t.id; persist()"
            >
              <span :class="t.icon"></span>{{ t.label }}
            </button>
          </div>
        </div>
        <div v-if="target === 'jpg'" class="quality">
          <span class="ctl-label">质量 {{ Math.round(quality * 100) }}%</span>
          <input
            type="range"
            min="10"
            max="100"
            :value="quality * 100"
            @input="quality = Number(($event.target as HTMLInputElement).value) / 100; persist()"
          />
        </div>
      </div>
    </div>

    <!-- 操作面板：工具栏 + 列表合并为一个整体 -->
    <div class="panel">
      <div class="toolbar">
        <div class="tinfo">
          共 <b>{{ items.length }}</b> 张 · 已转换 <b>{{ doneCount }}</b>
          <span v-if="zipSize" class="zipsize">（ZIP 约 {{ formatSize(zipSize) }}）</span>
        </div>
        <div class="tactions">
          <button class="btn primary" :disabled="!items.length || isConverting" @click="convertAll">
            <span class="i-mingcute-sparkles-line"></span>
            <span v-if="isConverting" class="spin"></span>{{ isConverting ? '转换中…' : '全部转换' }}
          </button>
          <button class="btn success" :disabled="!doneCount || isConverting" @click="downloadZip">
            <span class="i-mingcute-download-line"></span> 下载全部 ZIP
          </button>
          <button class="btn ghost" :disabled="isConverting" @click="clearAll">
            <span class="i-mingcute-delete-line"></span> 清空
          </button>
        </div>
      </div>

      <div class="pbar" :class="{ active: isConverting }">
        <div class="pfill" :style="{ width: progress + '%' }"></div>
      </div>

      <div class="list">
        <div class="list-head">
          <span></span>
          <span>文件名</span>
          <span>大小</span>
          <span>状态</span>
          <span class="ta-r">操作</span>
        </div>
        <div class="list-body">
          <div
            v-for="it in items"
            :key="it.id"
            class="file-row"
            :class="it.status"
          >
            <div class="thumb">
              <img :src="it.previewUrl" alt="" />
            </div>
            <div class="fname" :title="it.name">{{ it.name }}</div>
            <div class="fsize">{{ formatSize(it.size) }}</div>
            <div class="fstatus" :class="it.status" :title="it.status === 'error' ? (it.error ?? '') : ''">
              <span class="dot"></span>
              <span class="stxt">{{ statusText(it) }}</span>
              <span v-if="it.status === 'done' && it.outSize" class="cmp">→ {{ formatSize(it.outSize) }}</span>
            </div>
            <div class="ops">
              <button
                v-if="it.status !== 'done'"
                class="mini primary"
                :disabled="isConverting"
                @click="convertOne(it)"
              >{{ it.status === 'error' ? '重试' : '转换' }}</button>
              <button v-if="it.status === 'done'" class="mini success" @click="downloadOne(it)">下载</button>
              <button class="mini danger" @click="removeFile(it.id)">
                <span class="i-mingcute-close-line"></span>
              </button>
            </div>
          </div>

          <div v-if="!items.length" class="empty">
            <span class="i-mingcute-photo-album-line big"></span>
            <p>还没有图片，拖拽或点击上方区域添加吧～</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toasts">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.msg }}</div>
    </div>
  </div>
</template>

<style scoped>
.conv {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
}

/* 卡片 */
.card {
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid var(--border);
  border-radius: 20px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  box-shadow: var(--shadow);
}

.drop {
  border: 2px dashed var(--accent-border);
  border-radius: 16px;
  padding: 42px 16px;
  text-align: center;
  cursor: pointer;
  background: rgba(240, 247, 255, 0.6);
  transition: transform 0.15s ease, background 0.18s ease, border-color 0.18s ease;
}
.drop:hover {
  background: var(--accent-bg);
}
.drop:active {
  transform: scale(0.99);
}
.drop.over {
  border-color: var(--pink);
  background: var(--pink-bg);
  transform: scale(1.005);
}
.drop-icon {
  font-size: 42px;
  color: var(--pink);
  display: block;
}
.drop-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-h);
  margin-top: 6px;
}
.drop-title em {
  color: var(--pink);
  font-style: normal;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.drop-hint {
  font-size: 13px;
  color: var(--text);
  opacity: 0.7;
  margin-top: 4px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 36px;
  flex-wrap: wrap;
}
.ctl-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-h);
  display: block;
  margin-bottom: 10px;
}
.chips {
  display: flex;
  gap: 12px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 22px;
  border: 1.5px solid var(--border);
  background: #fff;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  transition: transform 0.14s ease, background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}
.chip span {
  font-size: 17px;
}
.chip:hover {
  border-color: var(--pink);
}
.chip:active {
  transform: scale(0.95);
}
.chip.on {
  background: var(--pink);
  color: #fff;
  border-color: var(--pink);
  box-shadow: 0 6px 16px -6px var(--pink);
}
.quality {
  min-width: 200px;
}
.quality input[type='range'] {
  width: 100%;
  accent-color: var(--accent);
}

/* 操作面板：工具栏 + 列表合并为一个整体 */
.panel {
  width: 100%;
  background: var(--color-surface);
  border: 1.5px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 18px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
}
.tinfo {
  font-size: 14px;
  color: var(--text);
}
.tinfo b {
  color: var(--text-h);
}
.zipsize {
  opacity: 0.7;
}
.tactions {
  margin-left: auto;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.2s ease, filter 0.14s ease;
}
.btn span:not(.spin) {
  font-size: 16px;
}
.btn:active {
  transform: scale(0.95);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--accent);
  color: #fff;
}
.btn.primary:hover:not(:disabled) {
  filter: brightness(1.04);
}
.btn.success {
  background: #5fd0a0;
  color: #fff;
}
.btn.success:hover:not(:disabled) {
  filter: brightness(1.04);
}
.btn.ghost {
  background: #fff;
  color: var(--text);
  border: 1.5px solid var(--border);
}
.spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pbar {
  width: 100%;
  height: 5px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  display: none;
}
.pbar.active {
  display: block;
}
.pfill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--pink));
  transition: width 0.25s ease;
}

/* 列表 */
.list {
  width: 100%;
}
.list-head,
.file-row {
  display: grid;
  grid-template-columns: 40px 1fr 96px 140px 160px;
  gap: 10px;
  align-items: center;
}
.list-head {
  padding: 11px 18px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}
.list-head .ta-r {
  text-align: right;
}
.list-body {
  max-height: 460px;
  overflow-y: auto;
}
.list-body::-webkit-scrollbar { width: 6px; }
.list-body::-webkit-scrollbar-track { background: transparent; }
.list-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
.file-row {
  padding: 10px 18px;
  border-bottom: 1px solid rgba(135, 206, 235, 0.22);
  font-size: 14px;
  transition: background 0.14s ease;
}
.file-row:last-child {
  border-bottom: none;
}
.file-row:hover {
  background: var(--bg-soft);
}
.thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-soft);
  flex-shrink: 0;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fname {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fsize {
  font-size: 13px;
  color: var(--text);
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}
.fstatus {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}
.fstatus .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.fstatus .stxt { white-space: nowrap; }
.fstatus .cmp {
  font-weight: 500;
  opacity: 0.7;
  margin-left: 2px;
  white-space: nowrap;
}
.fstatus.pending { color: var(--text); opacity: 0.75; }
.fstatus.pending .dot { background: var(--text); opacity: 0.4; }
.fstatus.converting { color: var(--warning); }
.fstatus.converting .dot {
  background: var(--warning);
  animation: pulse 0.8s ease-in-out infinite;
}
.fstatus.done { color: var(--success); }
.fstatus.done .dot { background: var(--success); }
.fstatus.error { color: var(--error); }
.fstatus.error .dot { background: var(--error); }
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
.ops {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 12px;
  border: none;
  border-radius: 9px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.12s ease;
  white-space: nowrap;
}
.mini span { font-size: 13px; }
.mini:active {
  transform: scale(0.93);
}
.mini.primary { background: var(--pink); color: #fff; }
.mini.success { background: var(--success); color: #fff; }
.mini.danger { background: #fff; color: var(--error); border: 1.5px solid #ffd4de; padding: 5px 9px; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 46px 20px;
  color: var(--text);
  opacity: 0.7;
  text-align: center;
}
.empty .big {
  font-size: 52px;
  color: var(--pink);
}

/* Toast */
.toasts {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.toast {
  padding: 12px 18px;
  border-radius: 12px;
  background: var(--text-h);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow);
  animation: slideUp 0.3s ease-out;
  border-left: 4px solid var(--pink);
  max-width: 340px;
}
.toast.success { border-left-color: #5fd0a0; }
.toast.error { border-left-color: #ff8fab; }
.toast.warning { border-left-color: #ffcf5c; }
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .tactions { margin-left: 0; justify-content: center; flex-wrap: wrap; }
  .list-head, .file-row { grid-template-columns: 32px 1fr 64px 84px 104px; gap: 6px; font-size: 12px; padding-left: 12px; padding-right: 12px; }
  .fstatus .cmp { display: none; }
}
</style>
