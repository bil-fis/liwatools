<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'image-compress'

interface CompressState {
  quality: number // 1-100
  format: 'jpeg' | 'webp'
}

const persisted = store.getData<CompressState>(KEY, { quality: 80, format: 'jpeg' })
const quality = ref(persisted.quality)
const format = ref<'jpeg' | 'webp'>(persisted.format)

const fileInput = ref<HTMLInputElement | null>(null)
const origImg = ref<HTMLImageElement | null>(null)
const origUrl = ref('')
const outUrl = ref('')
const fileName = ref('')
const origSize = ref(0)
const outSize = ref(0)
const ready = ref(false)
const processing = ref(false)
let timer: number | undefined

const origSizeText = computed(() => formatSize(origSize.value))
const outSizeText = computed(() => formatSize(outSize.value))
const ratio = computed(() => {
  if (!origSize.value || !outSize.value) return 0
  return Math.round((1 - outSize.value / origSize.value) * 100)
})
const canSave = computed(() => ready.value && !!outUrl.value)

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i]
}
function baseName(n: string) {
  const d = n.lastIndexOf('.')
  return d > 0 ? n.slice(0, d) : n
}

function persist() {
  store.setData(KEY, { quality: quality.value, format: format.value })
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
  if (origUrl.value) URL.revokeObjectURL(origUrl.value)
  if (outUrl.value) URL.revokeObjectURL(outUrl.value)
  fileName.value = file.name
  origSize.value = file.size
  outSize.value = 0
  ready.value = false
  const url = URL.createObjectURL(file)
  origUrl.value = url
  const img = new Image()
  img.onload = () => {
    origImg.value = img
    compress()
  }
  img.src = url
}

function compress() {
  const img = origImg.value
  if (!img) return
  processing.value = true
  if (timer) clearTimeout(timer)
  timer = window.setTimeout(() => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const mime = format.value === 'webp' ? 'image/webp' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          processing.value = false
          if (!blob) return
          if (outUrl.value) URL.revokeObjectURL(outUrl.value)
          outUrl.value = URL.createObjectURL(blob)
          outSize.value = blob.size
          ready.value = true
        },
        mime,
        quality.value / 100,
      )
    } catch {
      processing.value = false
    }
  }, 120)
}

function onQuality(e: Event) {
  quality.value = Number((e.target as HTMLInputElement).value)
  persist()
  compress()
}

function onFormat(e: Event) {
  format.value = (e.target as HTMLSelectElement).value as 'jpeg' | 'webp'
  persist()
  compress()
}

function download() {
  if (!outUrl.value) return
  const a = document.createElement('a')
  a.href = outUrl.value
  a.download = `${baseName(fileName.value)}_compressed.${format.value === 'webp' ? 'webp' : 'jpg'}`
  a.click()
}
</script>

<template>
  <div class="tool-body compress-tool">
    <!-- 选择区 -->
    <div class="pick-card">
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onInput" />
      <button class="pick-btn" @click="pick">
        <span class="i-mingcute-folder-open-line"></span> 选择图片
      </button>
      <span v-if="fileName" class="fname" :title="fileName">{{ fileName }}</span>
    </div>

    <!-- 对比 -->
    <div v-if="origUrl" class="compare">
      <div class="panel">
        <div class="panel-head">
          <span class="i-mingcute-photo-album-line"></span> 原图
          <b>{{ origSizeText }}</b>
        </div>
        <div class="panel-body">
          <img :src="origUrl" alt="原图" />
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <span class="i-mingcute-sparkles-line"></span> 压缩后
          <b>{{ outSizeText }}</b>
        </div>
        <div class="panel-body">
          <img v-if="outUrl" :src="outUrl" alt="压缩后" />
          <div v-else class="ph">
            <span class="spin" v-if="processing"></span>
            <span v-else class="i-mingcute-loading-3-line"></span>
            处理中…
          </div>
        </div>
      </div>
    </div>

    <!-- 压缩率 -->
    <div v-if="ratio" class="ratio">
      <span class="r-val" :class="{ bad: ratio < 0 }">{{ ratio >= 0 ? '-' : '+' }}{{ Math.abs(ratio) }}%</span>
      <span class="r-text">体积{{ ratio >= 0 ? '减少' : '增加' }}</span>
    </div>

    <!-- 控制 -->
    <div v-if="origUrl" class="controls">
      <div class="ctrl">
        <label>输出格式</label>
        <select class="input" :value="format" @change="onFormat">
          <option value="jpeg">JPG</option>
          <option value="webp">WEBP</option>
        </select>
      </div>
      <div class="ctrl grow">
        <label>质量 {{ quality }}%</label>
        <input
          class="slider"
          type="range"
          min="1"
          max="100"
          :value="quality"
          @input="onQuality"
        />
      </div>
    </div>

    <div v-if="canSave" class="actions">
      <button class="btn save" @click="download">
        <span class="i-mingcute-download-line"></span> 下载压缩图片
      </button>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty">
      <span class="i-mingcute-file-zip-line big"></span>
      <p>选择一张图片开始压缩吧～</p>
      <p class="hint">纯前端处理，图片不会上传，保护隐私</p>
    </div>
  </div>
</template>

<style scoped>
.compress-tool { max-width: 720px; }

.pick-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
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
.pick-btn:hover { background: var(--accent); color: #fff; }
.pick-btn:active { transform: scale(0.95); }
.pick-btn span { font-size: 17px; }
.fname {
  font-size: 13px;
  color: var(--text);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
}
.panel {
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
.panel-head span { color: var(--accent); font-size: 15px; }
.panel-head b { margin-left: auto; font-weight: 600; font-size: 12px; color: var(--text); }
.panel-body {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background-image: repeating-conic-gradient(#f5f0e0 0% 25%, #fff 0% 50%);
  background-size: 18px 18px;
}
.panel-body img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 10px;
}
.ph {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  opacity: 0.7;
  font-size: 13px;
}
.spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.ratio {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 14px;
  background: var(--accent-bg);
}
.r-val {
  font-size: 18px;
  font-weight: 800;
  color: #2fae7e;
}
.r-val.bad { color: #e05c7a; }
.r-text { font-size: 13px; color: var(--text); }

.controls {
  display: flex;
  gap: 20px;
  width: 100%;
  align-items: flex-end;
  flex-wrap: wrap;
}
.ctrl { display: flex; flex-direction: column; gap: 8px; }
.ctrl.grow { flex: 1; min-width: 200px; }
.ctrl label { font-size: 13px; font-weight: 700; color: var(--text-h); }
.ctrl select { min-width: 120px; }
.slider {
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.12s ease;
}
.slider::-webkit-slider-thumb:active { transform: scale(1.15); }
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: var(--shadow);
  cursor: pointer;
}

.actions { width: 100%; }
.save { width: 100%; justify-content: center; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 46px 20px;
  color: var(--text);
  opacity: 0.8;
  text-align: center;
}
.empty .big {
  font-size: 52px;
  color: var(--accent);
}
.empty p { font-size: 15px; font-weight: 600; }
.empty .hint { font-size: 13px !important; font-weight: 400 !important; opacity: 0.7; }

@media (max-width: 560px) {
  .compare { grid-template-columns: 1fr; }
  .controls { flex-direction: column; }
  .ctrl.grow { width: 100%; }
}
</style>
