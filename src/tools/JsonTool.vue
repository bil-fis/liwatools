<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useToolsStore } from '../stores/tools'
import Prism from 'prismjs'
import 'prismjs/components/prism-json'

const store = useToolsStore()
const KEY = 'json'

const DEFAULT_SAMPLE = JSON.stringify(
  {
    name: 'JSON 辅助工具',
    version: '2.0',
    description: '全功能 JSON 编辑器',
    features: ['格式化', '压缩', '验证', '转义', 'JSONPath', '比较'],
    config: { theme: 'light', indent: 4, autoSave: false },
    data: {
      items: [
        { id: 1, name: '示例项 A', active: true },
        { id: 2, name: '示例项 B', active: false },
        { id: 3, name: '示例项 C', active: true },
      ],
      total: 3,
    },
  },
  null,
  2,
)

interface JsonState {
  input: string
  indent: '2' | '4' | '8' | 'tab'
  output: string
  outputMode: 'highlight' | 'raw'
}

const persisted = store.getData<JsonState>(KEY, {
  input: DEFAULT_SAMPLE,
  indent: '4',
  output: '',
  outputMode: 'highlight',
})

const input = ref(persisted.input)
const indent = ref<JsonState['indent']>(persisted.indent)
const output = ref(persisted.output)
const outputMode = ref<JsonState['outputMode']>(persisted.outputMode)

// 状态栏
const statusType = ref<'idle' | 'valid' | 'invalid'>('idle')
const statusText = ref('就绪')
const errorMsg = ref('')
const keyCount = ref(0)
const byteSize = ref('0 B')
const cursorInfo = ref('行 1, 列 1')

// 模态框
const showJsonpath = ref(false)
const jsonpathExpr = ref('')
const jsonpathResult = ref('')
const showCompare = ref(false)
const compareLeft = ref('')
const compareRight = ref('')
const compareResult = ref('')

// DOM 引用（滚动同步）
const inputArea = ref<HTMLTextAreaElement | null>(null)
const inputLines = ref<HTMLElement | null>(null)
const outputArea = ref<HTMLElement | null>(null)
const outputLines = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// ---------- 工具函数 ----------
function getIndent(): string | number {
  return indent.value === 'tab' ? '\t' : Number(indent.value)
}
function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
function countKeys(obj: any): number {
  if (obj === null || typeof obj !== 'object') return 0
  if (Array.isArray(obj)) {
    let c = obj.length
    for (const item of obj) c += countKeys(item)
    return c
  }
  let c = Object.keys(obj).length
  for (const k of Object.keys(obj)) c += countKeys(obj[k])
  return c
}

// ---------- 语法高亮 (Prism.js) ----------
function highlightJson(text: string): string {
  if (!text || !text.trim()) return '<span class="j-muted">等待输入…</span>'
  try {
    if (!Prism.languages.json) return escapeHtml(text)
    return Prism.highlight(text, Prism.languages.json, 'json')
  } catch {
    return escapeHtml(text)
  }
}

const renderedOutput = computed(() => {
  if (!output.value.trim()) return '<span class="j-muted">等待输入…</span>'
  if (outputMode.value === 'raw') return escapeHtml(output.value)
  return highlightJson(output.value)
})
const inputLineCount = computed(() => Math.max(input.value.split('\n').length, 1))
const outputLineCount = computed(() => Math.max(output.value.split('\n').length, 1))

// ---------- 状态/统计 ----------
function setStatus(type: 'idle' | 'valid' | 'invalid', text: string) {
  statusType.value = type
  statusText.value = text
}
function setOutput(text: string) {
  output.value = text
  const trimmed = text.trim()
  if (!trimmed) {
    keyCount.value = 0
    byteSize.value = '0 B'
    return
  }
  try {
    const parsed = JSON.parse(trimmed)
    keyCount.value = countKeys(parsed)
  } catch {
    keyCount.value = 0
  }
  byteSize.value = formatBytes(new Blob([trimmed]).size)
}

// ---------- 核心操作 ----------
function formatJSON() {
  const v = input.value.trim()
  if (!v) {
    setStatus('idle', '请输入 JSON')
    return
  }
  try {
    const parsed = JSON.parse(v)
    setOutput(JSON.stringify(parsed, null, getIndent()))
    setStatus('valid', '格式化成功')
    errorMsg.value = ''
  } catch (e) {
    setStatus('invalid', 'JSON 无效')
    errorMsg.value = (e as Error).message
    output.value = input.value
  }
}
function minifyJSON() {
  const v = input.value.trim()
  if (!v) {
    setStatus('idle', '请输入 JSON')
    return
  }
  try {
    const parsed = JSON.parse(v)
    output.value = JSON.stringify(parsed)
    setStatus('valid', '压缩成功')
    errorMsg.value = ''
    setOutput(output.value)
  } catch (e) {
    setStatus('invalid', 'JSON 无效')
    errorMsg.value = (e as Error).message
  }
}
function validateJSON() {
  const v = input.value.trim()
  if (!v) {
    setStatus('idle', '请输入 JSON')
    errorMsg.value = ''
    return
  }
  try {
    const parsed = JSON.parse(v)
    setOutput(JSON.stringify(parsed, null, getIndent()))
    setStatus('valid', 'JSON 合法')
    errorMsg.value = ''
  } catch (e) {
    setStatus('invalid', 'JSON 无效')
    errorMsg.value = (e as Error).message
  }
}
function escapeJSON() {
  if (!input.value) {
    setStatus('idle', '请输入内容')
    return
  }
  output.value = JSON.stringify(input.value)
  setStatus('idle', '转义完成')
  errorMsg.value = ''
  setOutput(output.value)
}
function unescapeJSON() {
  const v = input.value.trim()
  if (!v) {
    setStatus('idle', '请输入内容')
    return
  }
  try {
    const u = JSON.parse(v)
    if (typeof u === 'string') {
      output.value = u
      setStatus('idle', '反转义完成')
    } else {
      setOutput(JSON.stringify(u, null, 2))
      setStatus('idle', '反转义完成 (解析为 JSON)')
    }
    errorMsg.value = ''
  } catch {
    const manual = v
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\')
    output.value = manual
    setStatus('idle', '反转义完成 (手动)')
    errorMsg.value = ''
    setOutput(output.value)
  }
}
async function copyOutput() {
  const text = output.value
  if (!text.trim()) {
    setStatus('idle', '没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    setStatus('valid', '已复制到剪贴板')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setStatus('valid', '已复制')
  }
}
function downloadJSON() {
  const text = output.value
  if (!text.trim()) {
    setStatus('idle', '没有内容可下载')
    return
  }
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'data.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  setStatus('valid', '下载成功')
}
function clearAll() {
  input.value = ''
  output.value = ''
  setStatus('idle', '已清空')
  errorMsg.value = ''
  keyCount.value = 0
  byteSize.value = '0 B'
  cursorInfo.value = '行 1, 列 1'
}

// ---------- 滚动同步 / 光标 ----------
function syncInputScroll() {
  if (inputLines.value && inputArea.value) inputLines.value.scrollTop = inputArea.value.scrollTop
}
function syncOutputScroll() {
  if (outputLines.value && outputArea.value) outputLines.value.scrollTop = outputArea.value.scrollTop
}
function updateCursor() {
  if (!inputArea.value) return
  const val = inputArea.value.value
  const pos = inputArea.value.selectionStart
  const lines = val.slice(0, pos).split('\n')
  cursorInfo.value = `行 ${lines.length}, 列 ${lines[lines.length - 1].length + 1}`
}
function onInput() {
  const v = input.value.trim()
  if (v) {
    try {
      JSON.parse(v)
      setStatus('valid', 'JSON 合法')
      errorMsg.value = ''
    } catch {
      setStatus('idle', '输入中…')
      errorMsg.value = ''
    }
  } else {
    setStatus('idle', '就绪')
    errorMsg.value = ''
  }
}

// ---------- 文件 / 粘贴 ----------
function loadFile() {
  fileInput.value?.click()
}
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    input.value = String(ev.target?.result ?? '')
    setStatus('idle', `已加载: ${f.name}`)
    errorMsg.value = ''
    formatJSON()
  }
  reader.onerror = () => setStatus('invalid', '读取文件失败')
  reader.readAsText(f)
  ;(e.target as HTMLInputElement).value = ''
}
async function pasteFromClip() {
  try {
    const text = await navigator.clipboard.readText()
    input.value = text
    setStatus('idle', '已粘贴')
    errorMsg.value = ''
  } catch {
    setStatus('invalid', '无法读取剪贴板')
  }
}

// ---------- 输出模式 ----------
function toggleOutputMode() {
  outputMode.value = outputMode.value === 'highlight' ? 'raw' : 'highlight'
}

// ---------- JSONPath ----------
function jsonPathQuery(obj: any, path: string): any[] {
  if (!path || path === '$') return [obj]
  if (path.startsWith('$.')) path = path.slice(2)
  else if (path.startsWith('$[')) {
    const m = path.match(/^\$\[([^\]]+)\](.*)$/)
    if (m) {
      const idx = m[1]
      const rest = m[2]
      if (idx === '*') {
        if (Array.isArray(obj)) return obj.flatMap((it) => jsonPathQuery(it, '$' + rest))
        return []
      }
      const n = parseInt(idx, 10)
      if (!isNaN(n) && Array.isArray(obj) && n >= 0 && n < obj.length) return jsonPathQuery(obj[n], '$' + rest)
      return []
    }
    return []
  }
  const parts = path.split('.')
  let cur: any = obj
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part === '*') {
      if (Array.isArray(cur)) return cur.flatMap((it) => jsonPathQuery(it, parts.slice(i + 1).join('.')))
      return []
    }
    if (part.includes('[') && part.includes(']')) {
      const am = part.match(/^([^\[]+)\[([^\]]+)\]$/)
      if (am) {
        const name = am[1]
        const idx = am[2]
        if (cur && typeof cur === 'object' && name in cur) {
          const arr = cur[name]
          if (idx === '*') {
            if (Array.isArray(arr)) return arr.flatMap((it) => jsonPathQuery(it, parts.slice(i + 1).join('.')))
            return []
          }
          const n = parseInt(idx, 10)
          if (!isNaN(n) && Array.isArray(arr) && n >= 0 && n < arr.length)
            return jsonPathQuery(arr[n], parts.slice(i + 1).join('.'))
          return []
        }
        return []
      }
    }
    if (cur && typeof cur === 'object' && part in cur) cur = cur[part]
    else return []
  }
  return [cur]
}
function openJsonpath() {
  showJsonpath.value = true
  jsonpathExpr.value = ''
  jsonpathResult.value = '<span class="j-muted">等待查询…</span>'
}
function executeJsonPath() {
  const v = input.value.trim()
  if (!v) {
    jsonpathResult.value = '<span class="j-danger"><i class="i-mingcute-alert-line"></i> 请先在主输入中提供 JSON 数据</span>'
    return
  }
  let obj: any
  try {
    obj = JSON.parse(v)
  } catch {
    jsonpathResult.value = '<span class="j-danger"><i class="i-mingcute-alert-line"></i> 主输入中的 JSON 无效</span>'
    return
  }
  const p = jsonpathExpr.value.trim()
  if (!p) {
    jsonpathResult.value = '<span class="j-warning">请输入 JSONPath 表达式</span>'
    return
  }
  try {
    const res = jsonPathQuery(obj, p)
    if (res.length === 0) {
      jsonpathResult.value = '<span class="j-muted">未找到匹配结果</span>'
    } else {
      const fmt = JSON.stringify(res.length === 1 ? res[0] : res, null, 2)
      jsonpathResult.value = `<span class="j-hint">找到 ${res.length} 个结果:</span>\n${highlightJson(fmt)}`
    }
  } catch (e) {
    jsonpathResult.value = `<span class="j-danger">⚠️ 查询错误: ${escapeHtml((e as Error).message)}</span>`
  }
}

// ---------- 比较 ----------
interface Diff {
  type: 'added' | 'removed' | 'changed'
  path: string
  message: string
}
function deepDiff(a: any, b: any, path = '根', results: Diff[] = []): Diff[] {
  const ta = typeof a
  const tb = typeof b
  if (a === b) return results
  if (a === null || b === null || ta !== tb) {
    results.push({ type: 'changed', path, message: `${ta} → ${tb}` })
    return results
  }
  if (ta === 'string' || ta === 'number' || ta === 'boolean') {
    if (a !== b) results.push({ type: 'changed', path, message: `"${String(a)}" → "${String(b)}"` })
    return results
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i++) {
      const sp = `${path}[${i}]`
      if (i >= a.length) results.push({ type: 'added', path: sp, message: `新增元素: ${JSON.stringify(b[i])}` })
      else if (i >= b.length) results.push({ type: 'removed', path: sp, message: `移除元素: ${JSON.stringify(a[i])}` })
      else deepDiff(a[i], b[i], sp, results)
    }
    return results
  }
  if (ta === 'object' && tb === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      const sp = path === '根' ? k : `${path}.${k}`
      if (!(k in a)) results.push({ type: 'added', path: sp, message: `新增属性: ${JSON.stringify(b[k])}` })
      else if (!(k in b)) results.push({ type: 'removed', path: sp, message: `移除属性: ${JSON.stringify(a[k])}` })
      else deepDiff(a[k], b[k], sp, results)
    }
    return results
  }
  results.push({ type: 'changed', path, message: `无法比较: ${ta} vs ${tb}` })
  return results
}
function openCompare() {
  showCompare.value = true
  compareLeft.value = input.value
  compareRight.value = ''
  compareResult.value = '<span class="j-muted">等待比较…</span>'
}
function executeCompare() {
  const l = compareLeft.value.trim()
  const r = compareRight.value.trim()
  if (!l || !r) {
    compareResult.value = '<span class="j-warning">请填写两侧的 JSON</span>'
    return
  }
  let lo: any, ro: any
  try {
    lo = JSON.parse(l)
  } catch {
    compareResult.value = '<span class="j-danger"><i class="i-mingcute-alert-line"></i> 左侧 JSON 无效</span>'
    return
  }
  try {
    ro = JSON.parse(r)
  } catch {
    compareResult.value = '<span class="j-danger"><i class="i-mingcute-alert-line"></i> 右侧 JSON 无效</span>'
    return
  }
  const diff = deepDiff(lo, ro)
  if (diff.length === 0) {
    compareResult.value = '<span class="j-success"><i class="i-mingcute-check-circle-line"></i> 两个 JSON 完全相同</span>'
  } else {
    let html = '<span class="j-strong">差异列表:</span>\n'
    for (const d of diff) {
      const color = d.type === 'added' ? 'var(--success)' : d.type === 'removed' ? 'var(--error)' : 'var(--warning)'
      const icon =
        d.type === 'added'
          ? '<i class="i-mingcute-add-line"></i>'
          : d.type === 'removed'
            ? '<i class="i-mingcute-subtract-line"></i>'
            : '<i class="i-mingcute-pencil-line"></i>'
      html += `<div style="color:${color};padding:2px 0;">${icon} ${escapeHtml(d.path)}: ${escapeHtml(d.message)}</div>`
    }
    compareResult.value = html
  }
}
function swapCompare() {
  const t = compareLeft.value
  compareLeft.value = compareRight.value
  compareRight.value = t
}

// ---------- 快捷键 ----------
function onKey(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey) {
    const map: Record<string, () => void> = {
      F: formatJSON,
      M: minifyJSON,
      V: validateJSON,
      C: copyOutput,
      X: clearAll,
    }
    if (map[e.key.toUpperCase()]) {
      e.preventDefault()
      map[e.key.toUpperCase()]()
    }
  } else if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    formatJSON()
  } else if (e.key === 'Escape') {
    showJsonpath.value = false
    showCompare.value = false
  }
}

// 初始
onMounted(() => {
  formatJSON()
  updateCursor()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

// 持久化
watch([input, indent, output, outputMode], () => {
  store.setData(KEY, {
    input: input.value,
    indent: indent.value,
    output: output.value,
    outputMode: outputMode.value,
  })
})
</script>

<template>
  <div class="json-tool">
    <!-- 工具栏 -->
    <div class="jtoolbar">
      <div class="jgroup">
        <span class="jlabel">编辑</span>
        <button class="jb primary" @click="formatJSON"><span class="i-mingcute-diamond-fill"></span> 格式化</button>
        <button class="jb" @click="minifyJSON"><span class="i-mingcute-package-fill"></span> 压缩</button>
        <button class="jb" @click="validateJSON"><span class="i-mingcute-check-circle-line"></span> 验证</button>
      </div>
      <div class="jgroup">
        <span class="jlabel">转义</span>
        <button class="jb" @click="escapeJSON"><span class="i-mingcute-refresh-1-line"></span> 转义</button>
        <button class="jb" @click="unescapeJSON"><span class="i-mingcute-refresh-2-line"></span> 反转义</button>
      </div>
      <div class="jgroup">
        <span class="jlabel">高级</span>
        <button class="jb" @click="openJsonpath"><span class="i-mingcute-search-2-line"></span> JSONPath</button>
        <button class="jb" @click="openCompare"><span class="i-mingcute-transfer-line"></span> 比较</button>
      </div>
      <div class="jgroup">
        <span class="jlabel">操作</span>
        <button class="jb" @click="copyOutput"><span class="i-mingcute-copy-2-line"></span> 复制</button>
        <button class="jb" @click="downloadJSON"><span class="i-mingcute-file-download-line"></span> 下载</button>
        <button class="jb danger" @click="clearAll"><span class="i-mingcute-delete-line"></span> 清空</button>
      </div>
      <div class="jgroup" style="border-right: none; padding-right: 0; margin-right: 0">
        <span class="jlabel">缩进</span>
        <select v-model="indent" class="jselect" @change="formatJSON">
          <option value="2">2 空格</option>
          <option value="4">4 空格</option>
          <option value="8">8 空格</option>
          <option value="tab">Tab</option>
        </select>
      </div>
    </div>

    <!-- 双栏编辑区 -->
    <div class="panes">
      <div class="pane">
        <div class="pane-head">
          <span><span class="i-mingcute-file-import-line"></span> 输入</span>
          <div class="pane-act">
            <button class="jmini" @click="loadFile"><span class="i-mingcute-folder-upload-line"></span> 加载</button>
            <button class="jmini" @click="pasteFromClip"><span class="i-mingcute-clipboard-line"></span> 粘贴</button>
            <input ref="fileInput" type="file" accept=".json,.jsonc" hidden @change="onFileChange" />
          </div>
        </div>
        <div class="editor-wrap">
          <div ref="inputLines" class="line-numbers">
            <span v-for="n in inputLineCount" :key="n">{{ n }}</span>
          </div>
          <textarea
            ref="inputArea"
            v-model="input"
            class="editor-area in-area"
            spellcheck="false"
            placeholder='输入 JSON 数据… 例如: {"name":"JSON工具","version":"2.0"}'
            @scroll="syncInputScroll"
            @input="onInput"
            @click="updateCursor"
            @keyup="updateCursor"
          ></textarea>
        </div>
      </div>

      <div class="pane">
        <div class="pane-head">
          <span>
            <span class="i-mingcute-file-export-line"></span> 输出
            <span class="pane-sub">{{ outputMode === 'highlight' ? '(高亮)' : '(原始)' }}</span>
          </span>
          <div class="pane-act">
            <button class="jmini" @click="toggleOutputMode"><span class="i-mingcute-refresh-1-line"></span> 原始/高亮</button>
          </div>
        </div>
        <div class="editor-wrap">
          <div ref="outputLines" class="line-numbers">
            <span v-for="n in outputLineCount" :key="n">{{ n }}</span>
          </div>
          <pre
            ref="outputArea"
            class="editor-area out-area"
            v-html="renderedOutput"
            @scroll="syncOutputScroll"
          ></pre>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="statusbar">
      <div class="left">
        <span class="stat">
          <span class="dot" :class="statusType"></span>
          <span>{{ statusText }}</span>
        </span>
        <span class="stat"><span class="slabel">键:</span><b>{{ keyCount }}</b></span>
        <span class="stat"><span class="slabel">大小:</span><b>{{ byteSize }}</b></span>
        <span class="stat"><span class="slabel">行:</span><b>{{ inputLineCount }}</b></span>
        <span v-if="errorMsg" class="err-msg"><i class="i-mingcute-alert-line"></i> {{ errorMsg }}</span>
      </div>
      <div class="right">
        <span>{{ cursorInfo }}</span>
        <span>UTF-8</span>
      </div>
    </div>

    <!-- JSONPath 模态框 -->
    <div class="modal-overlay" :class="{ active: showJsonpath }" @click.self="showJsonpath = false">
      <div class="modal">
        <div class="modal-head">
          <h2><span class="i-mingcute-search-2-line"></span> JSONPath 查询</h2>
          <button class="close" @click="showJsonpath = false">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-tip">输入 JSONPath 表达式，例如 <code>$.data.items[*].name</code></p>
          <input
            v-model="jsonpathExpr"
            class="jinput"
            placeholder="例如: $.data.items[*].name"
            @keyup.enter="executeJsonPath"
          />
          <div class="modal-actions">
            <button class="jb primary" @click="executeJsonPath">执行查询</button>
            <button class="jb" @click="jsonpathResult = '<span class=\'j-muted\'>已清空</span>'; jsonpathExpr = ''">
              清空结果
            </button>
          </div>
          <div class="modal-result" v-html="jsonpathResult"></div>
        </div>
        <div class="modal-foot">
          <button class="jb" @click="showJsonpath = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 比较模态框 -->
    <div class="modal-overlay" :class="{ active: showCompare }" @click.self="showCompare = false">
      <div class="modal wide">
        <div class="modal-head">
          <h2><span class="i-mingcute-transfer-line"></span> JSON 比较</h2>
          <button class="close" @click="showCompare = false">×</button>
        </div>
        <div class="modal-body">
          <div class="cmp-row">
            <div class="cmp-col">
              <label class="clabel">原始 JSON</label>
              <textarea v-model="compareLeft" class="ctext" spellcheck="false" placeholder="粘贴原始 JSON…"></textarea>
            </div>
            <div class="cmp-col">
              <label class="clabel">新 JSON</label>
              <textarea v-model="compareRight" class="ctext" spellcheck="false" placeholder="粘贴新 JSON…"></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button class="jb primary" @click="executeCompare">比较</button>
            <button class="jb" @click="swapCompare"><span class="i-mingcute-transfer-line"></span> 交换</button>
            <button
              class="jb"
              @click="compareLeft = ''; compareRight = ''; compareResult = '<span class=\'j-muted\'>已清空</span>'"
            >
              清空
            </button>
          </div>
          <div class="modal-result" v-html="compareResult"></div>
        </div>
        <div class="modal-foot">
          <button class="jb" @click="showCompare = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-tool {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ===== 工具栏 ===== */
.jtoolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  background: var(--bg-soft);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  align-items: center;
  flex-shrink: 0;
}
.jgroup {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-right: 4px;
  padding-right: 12px;
  border-right: 1px solid var(--border);
}
.jlabel {
  font-size: 11px;
  color: var(--text-secondary);
  margin-right: 4px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.jb {
  background: #fff;
  border: 1px solid var(--border);
  color: var(--text-h);
  padding: 6px 12px;
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.12s ease, color 0.18s ease,
    border-color 0.18s ease;
  white-space: nowrap;
}
.jb:hover {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}
.jb:active {
  transform: scale(0.96);
}
.jb.primary {
  background: var(--accent);
  color: #fff;
}
.jb.primary:hover {
  background: var(--btn-bg-hover);
}
.jb.danger {
  color: var(--error);
}
.jb.danger:hover {
  background: var(--error);
  color: #fff;
}
.jselect {
  background: #fff;
  color: var(--text-h);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 5px 10px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  outline: none;
}
.jselect:focus {
  border-color: var(--accent);
}

/* ===== 双栏 ===== */
.panes {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 14px;
}
.pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  flex-shrink: 0;
}
.pane-sub {
  font-weight: 500;
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: 4px;
}
.pane-act {
  display: flex;
  gap: 6px;
}
.jmini {
  background: #fff;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 4px 10px;
  border-radius: 8px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: 0.16s ease;
}
.jmini:hover {
  border-color: var(--accent);
  color: var(--color-primary-dark);
}

/* 编辑器 */
.editor-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  background: #fff;
}
.line-numbers {
  padding: 12px 8px 12px 12px;
  background: var(--bg-soft);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  text-align: right;
  user-select: none;
  overflow: hidden;
  min-width: 44px;
  border-right: 1px solid var(--border);
  flex-shrink: 0;
}
.line-numbers span {
  display: block;
}
.editor-area {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 12px 16px;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.6;
  background: #fff;
  color: var(--text-h);
  outline: none;
  white-space: pre;
  tab-size: 2;
  border: none;
  resize: none;
}
.in-area {
  font: inherit;
  font-family: var(--mono);
}
.out-area {
  margin: 0;
}
.editor-area::selection {
  background: var(--accent-bg);
}

/* 语法高亮（Prism.js，浅色主题） */
.json-tool :deep(.token.property) {
  color: var(--color-primary-dark);
}
.json-tool :deep(.token.string) {
  color: #1a7f37;
}
.json-tool :deep(.token.number) {
  color: #6741d9;
}
.json-tool :deep(.token.boolean) {
  color: #0b7285;
}
.json-tool :deep(.token.null) {
  color: #e8590c;
}
.json-tool :deep(.token.operator),
.json-tool :deep(.token.punctuation) {
  color: var(--text-secondary);
}
.j-muted {
  color: var(--text-secondary);
  font-style: italic;
}
.j-hint {
  color: var(--text-secondary);
  font-size: 12px;
}
.j-strong {
  color: var(--text-h);
  font-weight: 600;
}
.j-danger {
  color: var(--error);
}
.j-warning {
  color: var(--warning);
}
.j-success {
  color: var(--success);
}

/* ===== 状态栏 ===== */
.statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding: 8px 18px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.statusbar .left,
.statusbar .right {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.stat {
  display: flex;
  align-items: center;
  gap: 5px;
}
.stat b {
  color: var(--text-h);
  font-weight: 600;
}
.slabel {
  color: var(--text-secondary);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot.idle {
  background: var(--text-secondary);
}
.dot.valid {
  background: var(--success);
}
.dot.invalid {
  background: var(--error);
}
.err-msg {
  color: var(--error);
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 模态框 ===== */
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(30, 46, 62, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
.modal-overlay.active {
  display: flex;
}
.modal {
  background: var(--color-surface);
  border-radius: 18px;
  border: 1px solid var(--border);
  max-width: 820px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 80px rgba(30, 46, 62, 0.25);
  animation: modalIn 0.25s ease;
}
.modal.wide {
  max-width: 940px;
}
@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-head h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h);
}
.close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  transition: 0.2s;
}
.close:hover {
  color: var(--error);
  transform: rotate(90deg);
}
.modal-body {
  padding: 18px 22px;
  overflow-y: auto;
  flex: 1;
}
.modal-tip {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 10px;
}
.modal-tip code {
  background: var(--bg-soft);
  padding: 1px 8px;
  border-radius: 6px;
  font-family: var(--mono);
}
.jinput {
  width: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-h);
  padding: 10px 14px;
  font-family: var(--mono);
  font-size: 13px;
  outline: none;
  transition: 0.2s;
}
.jinput:focus {
  border-color: var(--accent);
}
.modal-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.modal-result {
  margin-top: 14px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  max-height: 220px;
  overflow: auto;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text-h);
  white-space: pre-wrap;
  word-break: break-all;
}
.modal-foot {
  padding: 12px 22px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}
.cmp-row {
  display: flex;
  gap: 16px;
}
.cmp-col {
  flex: 1;
  min-width: 0;
}
.clabel {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 600;
}
.ctext {
  width: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 13px;
  padding: 12px;
  resize: vertical;
  min-height: 130px;
  outline: none;
  transition: 0.2s;
}
.ctext:focus {
  border-color: var(--accent);
}

/* ===== 响应式 ===== */
@media (max-width: 860px) {
  .panes {
    flex-direction: column;
  }
  .pane {
    max-height: 42vh;
  }
  .jgroup {
    border-right: none;
    padding-right: 0;
    margin-right: 0;
  }
  .cmp-row {
    flex-direction: column;
  }
}
@media (max-width: 480px) {
  .jtoolbar {
    padding: 8px 10px;
  }
  .jb {
    padding: 4px 8px;
    font-size: 12px;
  }
  .jlabel {
    display: none;
  }
  .statusbar {
    font-size: 11px;
    padding: 6px 12px;
  }
  .err-msg {
    max-width: 160px;
  }
}
</style>
