<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useToolsStore } from '../stores/tools'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/github.css'
import hljsCss from 'highlight.js/styles/github.css?inline'

const store = useToolsStore()
const KEY = 'markdown'

const DEFAULT = [
].join('\n')

interface MdState {
  content: string
  view: 'split' | 'edit' | 'preview'
}

const persisted = store.getData<MdState>(KEY, { content: DEFAULT, view: 'split' })

const content = ref(persisted.content)
const view = ref<MdState['view']>(persisted.view)
const statusMsg = ref('已就绪')

const editorRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLElement | null>(null)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: (str: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch {
        /* ignore */
      }
    }
    try {
      return hljs.highlightAuto(str).value
    } catch {
      return ''
    }
  },
})

md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, idx, options)
}

const rendered = computed(() => {
  if (!content.value.trim()) return ''
  let html = md.render(content.value)
  html = html
    .replace(/<li>\[ \] (.*?)<\/li>/g, '<li class="task-item"><input type="checkbox" disabled /> $1</li>')
    .replace(/<li>\[x\] (.*?)<\/li>/g, '<li class="task-item"><input type="checkbox" checked disabled /> $1</li>')
  return html
})

const isEmpty = computed(() => !content.value.trim())

const stats = computed(() => {
  const text = content.value
  const chars = text.length
  const lines = text ? text.split('\n').length : 0
  const words = (text.match(/[一-龥]|[A-Za-z0-9_]+/g) || []).length
  return { chars, lines, words }
})

const viewClass = computed(() => {
  if (view.value === 'edit') return 'edit-only'
  if (view.value === 'preview') return 'preview-only'
  return ''
})

let statusTimer: number | undefined
function flash(msg: string) {
  statusMsg.value = msg
  clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => {
    statusMsg.value = '已就绪'
  }, 2500)
}

function onInput(e: Event) {
  content.value = (e.target as HTMLTextAreaElement).value
}

function getSel() {
  const el = editorRef.value!
  const start = el.selectionStart
  const end = el.selectionEnd
  const text = el.value
  return {
    start,
    end,
    selected: text.slice(start, end),
    before: text.slice(0, start),
    after: text.slice(end),
  }
}

async function applyEdit(newText: string, selStart: number, selEnd: number) {
  content.value = newText
  await nextTick()
  const el = editorRef.value
  if (!el) return
  el.focus()
  el.setSelectionRange(selStart, selEnd)
}

function wrap(left: string, right: string) {
  const sel = getSel()
  const newText = sel.before + left + sel.selected + right + sel.after
  const ns = sel.start + left.length
  const ne = sel.end + left.length
  applyEdit(newText, ns, ne)
  flash(`已插入 ${left.trim() || '格式'}`)
}

function wrapBlock(prefix: string, suffix = '') {
  const sel = getSel()
  const p = prefix.trim()
  const lines = sel.selected.split('\n')
  const newLines = lines.map((line) => (line.startsWith(p) ? line.slice(p.length) : prefix + line))
  const newSelected = newLines.join('\n') + suffix
  const newText = sel.before + newSelected + sel.after
  applyEdit(newText, sel.start, sel.start + newSelected.length)
}

function insertHeading(level: number) {
  const sel = getSel()
  const prefix = '#'.repeat(level) + ' '
  const lines = sel.selected.split('\n')
  const newLines = lines.map((line) => {
    const m = line.match(/^(#{1,6})\s+(.*)/)
    if (m) return '#'.repeat(level) + ' ' + m[2]
    return prefix + line
  })
  const newSelected = newLines.join('\n')
  const newText = sel.before + newSelected + sel.after
  applyEdit(newText, sel.start, sel.start + newSelected.length)
  flash(`已插入 H${level}`)
}

function insertLink() {
  const sel = getSel()
  const text = sel.selected || '链接文字'
  const url = window.prompt('请输入链接地址：', 'https://')
  if (url === null) return
  const mdText = `[${text}](${url})`
  const newText = sel.before + mdText + sel.after
  applyEdit(newText, sel.start + mdText.length, sel.start + mdText.length)
  flash('已插入链接')
}

function insertImage() {
  const sel = getSel()
  const alt = window.prompt('请输入图片描述：', '图片') ?? '图片'
  const url = window.prompt('请输入图片 URL：', 'https://')
  if (url === null) return
  const mdText = `![${alt}](${url})`
  const newText = sel.before + mdText + sel.after
  applyEdit(newText, sel.start + mdText.length, sel.start + mdText.length)
  flash('已插入图片')
}

function insertTable() {
  const sel = getSel()
  const table = '\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |\n'
  const newText = sel.before + table + sel.after
  const pos = sel.start + table.length
  applyEdit(newText, pos, pos)
  flash('已插入表格')
}

function insertHr() {
  const sel = getSel()
  const hr = '\n---\n'
  const newText = sel.before + hr + sel.after
  const pos = sel.start + hr.length
  applyEdit(newText, pos, pos)
  flash('已插入分隔线')
}

function setView(v: MdState['view']) {
  view.value = v
}

function clearAll() {
  if (window.confirm('确定要清空所有内容吗？')) {
    content.value = ''
    flash('已清空')
    nextTick(() => editorRef.value?.focus())
  }
}

function copyMd() {
  const text = content.value
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => flash('已复制到剪贴板'),
      () => fallbackCopy(text),
    )
  } else {
    fallbackCopy(text)
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    flash('已复制到剪贴板')
  } catch {
    flash('复制失败')
  }
  document.body.removeChild(ta)
}

function download(filename: string, mime: string, text: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const EXPORT_CSS = `
:root{color-scheme:light}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,'PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.6;color:#1f2328;max-width:920px;margin:0 auto;padding:32px 16px;word-wrap:break-word}
h1,h2,h3,h4,h5,h6{margin-top:24px;margin-bottom:16px;font-weight:600;line-height:1.25}
h1,h2{border-bottom:1px solid #d1d9e0;padding-bottom:.3em}
h1{font-size:2em}
h2{font-size:1.5em}
h3{font-size:1.25em}
h4{font-size:1em}
h5{font-size:.875em}
h6{font-size:.85em;color:#59636e}
p{margin:0 0 16px}
a{color:#0969da;text-decoration:none}
a:hover{text-decoration:underline}
ul,ol{padding-left:2em;margin:0 0 16px}
li{margin:.25em 0}
li p{margin:0}
blockquote{margin:0 0 16px;padding:0 1em;color:#59636e;border-left:.25em solid #d1d9e0}
code{font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:85%;padding:.2em .4em;background:rgba(175,184,193,.2);border-radius:6px}
pre{margin:0 0 16px;padding:16px;overflow:auto;background:#f6f8fa;border-radius:6px;font-size:85%;line-height:1.45}
pre code{padding:0;background:transparent;font-size:100%;border-radius:0}
img{max-width:100%}
table{border-collapse:collapse;margin:0 0 16px;display:block;width:max-content;max-width:100%;overflow:auto}
th,td{border:1px solid #d1d9e0;padding:6px 13px}
th{font-weight:600;background:#f6f8fa}
tr:nth-child(2n){background:#f6f8fa}
hr{height:.25em;padding:0;margin:24px 0;background:#d1d9e0;border:0}
.task-item{list-style:none}
.task-item input{margin-right:.4em}
`

function exportMd() {
  download('markdown-export.md', 'text/markdown', content.value)
  flash('Markdown 已导出')
}

function exportHtml() {
  const body = md.render(content.value || '')
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Markdown 导出</title>
<style>
${hljsCss}
${EXPORT_CSS}
</style>
</head>
<body>
${body}
</body>
</html>`
  download('markdown-export.html', 'text/html', html)
  flash('HTML 已导出')
}

let syncing = false
function onScroll(e: Event) {
  if (syncing) return
  const el = e.target as HTMLTextAreaElement
  const preview = previewRef.value
  if (!preview) return
  const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
  syncing = true
  preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)
  requestAnimationFrame(() => (syncing = false))
}

function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase()
    if (k === 'b') {
      e.preventDefault()
      wrap('**', '**')
      return
    }
    if (k === 'i') {
      e.preventDefault()
      wrap('*', '*')
      return
    }
    if (k === 's') {
      e.preventDefault()
      flash('已保存')
      return
    }
  }
  if (e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault()
    wrap('~~', '~~')
    return
  }
  if (e.key === 'Tab') {
    e.preventDefault()
    const sel = getSel()
    const lines = sel.selected.split('\n')
    if (e.shiftKey) {
      let removedFirst = 0
      const newLines = lines.map((l, i) => {
        const m = l.match(/^ {1,2}/)
        const r = m ? m[0].length : 0
        if (i === 0) removedFirst = r
        return l.slice(r)
      })
      const removedTotal = lines.reduce((acc, l) => acc + (l.match(/^ {1,2}/)?.[0].length || 0), 0)
      const newSelected = newLines.join('\n')
      const newText = sel.before + newSelected + sel.after
      applyEdit(newText, Math.max(0, sel.start - removedFirst), Math.max(0, sel.end - removedTotal))
    } else {
      const newLines = lines.map((l) => '  ' + l)
      const newSelected = newLines.join('\n')
      const newText = sel.before + newSelected + sel.after
      applyEdit(newText, sel.start + 2, sel.start + newSelected.length)
    }
  }
}

watch([content, view], () => {
  store.setData(KEY, { content: content.value, view: view.value })
})
</script>

<template>
  <div class="md-tool">
    <!-- 视图切换 + 操作 -->
    <div class="md-bar">
      <div class="md-views">
        <button class="md-view" :class="{ active: view === 'split' }" @click="setView('split')">
          <span class="i-mingcute-layout-2-line" /> 分屏
        </button>
        <button class="md-view" :class="{ active: view === 'edit' }" @click="setView('edit')">
          <span class="i-mingcute-pen-line" /> 编辑
        </button>
        <button class="md-view" :class="{ active: view === 'preview' }" @click="setView('preview')">
          <span class="i-mingcute-eye-line" /> 预览
        </button>
      </div>
      <div class="md-actions">
        <button class="md-act" @click="copyMd" title="复制 Markdown">
          <span class="i-mingcute-copy-2-line" /> 复制
        </button>
        <button class="md-act" @click="exportMd" title="导出 Markdown">
          <span class="i-mingcute-file-line" /> MD
        </button>
        <button class="md-act" @click="exportHtml" title="导出 HTML">
          <span class="i-mingcute-file-code-line" /> HTML
        </button>
        <span class="md-sep" />
        <button class="md-act danger" @click="clearAll" title="清空内容">
          <span class="i-mingcute-delete-line" />
        </button>
      </div>
    </div>

    <!-- 格式工具栏 -->
    <div class="md-toolbar">
      <div class="md-group">
        <button class="md-btn" @click="wrap('**', '**')" title="粗体 (Ctrl+B)">
          <span class="i-mingcute-bold-line" />
        </button>
        <button class="md-btn" @click="wrap('*', '*')" title="斜体 (Ctrl+I)">
          <span class="i-mingcute-italic-line" />
        </button>
        <button class="md-btn" @click="wrap('~~', '~~')" title="删除线 (Alt+S)">
          <span class="i-mingcute-strikethrough-line" />
        </button>
      </div>
      <div class="md-group">
        <button class="md-btn" @click="insertHeading(1)" title="一级标题">H1</button>
        <button class="md-btn" @click="insertHeading(2)" title="二级标题">H2</button>
        <button class="md-btn" @click="insertHeading(3)" title="三级标题">H3</button>
      </div>
      <div class="md-group">
        <button class="md-btn" @click="wrapBlock('> ', '')" title="引用">
          <span class="i-mingcute-quote-left-line" />
        </button>
        <button class="md-btn" @click="wrapBlock('- ', '')" title="无序列表">
          <span class="i-mingcute-list-collapse-line" />
        </button>
        <button class="md-btn" @click="wrapBlock('1. ', '')" title="有序列表">
          <span class="i-mingcute-list-ordered-line" />
        </button>
        <button class="md-btn" @click="wrapBlock('- [ ] ', '')" title="任务列表">
          <span class="i-mingcute-list-check-line" />
        </button>
      </div>
      <div class="md-group">
        <button class="md-btn" @click="wrapBlock('```\n', '\n```')" title="代码块">
          <span class="i-mingcute-code-line" />
        </button>
        <button class="md-btn" @click="insertLink" title="链接">
          <span class="i-mingcute-link-line" />
        </button>
        <button class="md-btn" @click="insertImage" title="图片">
          <span class="i-mingcute-photo-album-line" />
        </button>
        <button class="md-btn" @click="insertTable" title="表格">
          <span class="i-mingcute-table-2-line" />
        </button>
        <button class="md-btn" @click="insertHr" title="分隔线">
          <span class="i-mingcute-subtract-line" />
        </button>
      </div>
    </div>

    <!-- 编辑 / 预览 面板 -->
    <div class="md-panes" :class="viewClass">
      <section class="md-pane">
        <div class="md-pane-head">
          <span class="i-mingcute-pen-line" /> 编辑
          <span class="badge">Markdown</span>
        </div>
        <div class="md-pane-body">
          <textarea
            ref="editorRef"
            class="md-editor"
            :value="content"
            placeholder="在此输入 Markdown 内容…"
            spellcheck="false"
            @input="onInput"
            @keydown="onKeydown"
            @scroll="onScroll"
          />
        </div>
      </section>

      <section class="md-pane">
        <div class="md-pane-head">
          <span class="i-mingcute-eye-line" /> 预览
          <span class="badge">{{ stats.words }} 字</span>
        </div>
        <div ref="previewRef" class="md-pane-body">
          <div v-if="isEmpty" class="md-empty">
            <span class="i-mingcute-pen-line md-empty-icon" />
            <div>在左侧编辑区开始写作…</div>
            <small>支持 Markdown 语法，实时预览</small>
          </div>
          <div v-else class="md-content" v-html="rendered" />
        </div>
      </section>
    </div>

    <!-- 状态栏 -->
    <div class="md-status">
      <div class="md-stats">
        <span><span class="i-mingcute-text-line" /> {{ stats.chars }} 字符</span>
        <span><span class="i-mingcute-file-line" /> {{ stats.words }} 字</span>
        <span><span class="i-mingcute-list-ordered-line" /> {{ stats.lines }} 行</span>
      </div>
      <div class="md-msg">
        <span class="i-mingcute-check-line" /> {{ statusMsg }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.md-tool {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

/* ===== 顶部栏 ===== */
.md-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.md-views {
  display: flex;
  gap: 4px;
  background: var(--bg-soft);
  padding: 4px;
  border-radius: 10px;
}
.md-view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  cursor: pointer;
  transition: 0.2s;
}
.md-view:hover {
  color: var(--accent);
}
.md-view.active {
  background: var(--card);
  color: var(--accent);
  box-shadow: var(--shadow);
}
.md-view span[class^='i-mingcute'] {
  font-size: 15px;
}
.md-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.md-act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  background: var(--card);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: 0.2s;
}
.md-act:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.md-act.danger {
  color: #ef4444;
  border-color: transparent;
  background: transparent;
  padding: 6px 10px;
}
.md-act.danger:hover {
  background: #fee2e2;
}
.md-act span[class^='i-mingcute'] {
  font-size: 15px;
}
.md-sep {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
}

/* ===== 工具栏 ===== */
.md-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-soft);
  border-radius: 10px;
}
.md-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  border-right: 1px solid var(--border);
}
.md-group:last-child {
  border-right: none;
}
.md-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--text-h);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.15s;
}
.md-btn:hover {
  background: var(--card);
  color: var(--accent);
  box-shadow: var(--shadow);
}
.md-btn:active {
  transform: scale(0.92);
}
.md-btn span[class^='i-mingcute'] {
  font-size: 16px;
  font-weight: 400;
}

/* ===== 面板 ===== */
.md-panes {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}
.md-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.md-pane-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  background: var(--bg-soft);
  flex-shrink: 0;
}
.md-pane-head span[class^='i-mingcute'] {
  color: var(--accent);
  font-size: 15px;
}
.md-pane-head .badge {
  margin-left: auto;
}
.md-pane-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.md-editor {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: var(--mono, 'JetBrains Mono', 'Fira Code', monospace);
  font-size: 14px;
  line-height: 1.8;
  color: var(--text);
  background: #fff;
  padding: 16px 18px;
}
.md-editor::placeholder {
  color: #b9c4d0;
}

/* 视图模式 */
.edit-only .md-pane:last-child,
.preview-only .md-pane:first-child {
  display: none;
}
.edit-only .md-pane:first-child {
  margin-right: 0;
}
.preview-only .md-pane:last-child {
  margin-left: 0;
}

/* 空状态 */
.md-empty {
  color: #b9c4d0;
  text-align: center;
  padding: 40px 0;
  user-select: none;
}
.md-empty-icon {
  display: block;
  font-size: 32px;
  margin: 0 auto 12px;
  color: #dce3ec;
}
.md-empty small {
  font-size: 13px;
  color: #d0d8e3;
}

/* 状态栏 */
.md-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-h);
  flex-wrap: wrap;
}
.md-stats {
  display: flex;
  gap: 18px;
}
.md-stats span,
.md-msg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.md-stats span[class^='i-mingcute'] {
  color: var(--accent);
}
.md-msg span[class^='i-mingcute'] {
  color: #22c55e;
}

/* ===== 预览内容（GitHub 风格渲染） ===== */
.md-content {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial,
    "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #1f2328;
  word-wrap: break-word;
  padding: 16px 22px;
}
.md-content :deep(h1),
.md-content :deep(h2),
.md-content :deep(h3),
.md-content :deep(h4),
.md-content :deep(h5),
.md-content :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}
.md-content :deep(h1),
.md-content :deep(h2) {
  border-bottom: 1px solid #d1d9e0;
  padding-bottom: 0.3em;
}
.md-content :deep(h1) {
  font-size: 2em;
}
.md-content :deep(h2) {
  font-size: 1.5em;
}
.md-content :deep(h3) {
  font-size: 1.25em;
}
.md-content :deep(h4) {
  font-size: 1em;
}
.md-content :deep(h5) {
  font-size: 0.875em;
}
.md-content :deep(h6) {
  font-size: 0.85em;
  color: #59636e;
}
.md-content :deep(p) {
  margin: 0 0 16px;
}
.md-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}
.md-content :deep(a:hover) {
  text-decoration: underline;
}
.md-content :deep(ul),
.md-content :deep(ol) {
  padding-left: 2em;
  margin: 0 0 16px;
}
.md-content :deep(li) {
  margin: 0.25em 0;
}
.md-content :deep(li p) {
  margin: 0;
}
.md-content :deep(blockquote) {
  margin: 0 0 16px;
  padding: 0 1em;
  color: #59636e;
  border-left: 0.25em solid #d1d9e0;
}
.md-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 85%;
  padding: 0.2em 0.4em;
  background: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
}
.md-content :deep(pre) {
  margin: 0 0 16px;
  padding: 16px;
  overflow: auto;
  background: #f6f8fa;
  border-radius: 6px;
  font-size: 85%;
  line-height: 1.45;
}
.md-content :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: 100%;
  border-radius: 0;
}
.md-content :deep(img) {
  max-width: 100%;
}
.md-content :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  border-collapse: collapse;
  margin: 0 0 16px;
  overflow: auto;
}
.md-content :deep(th),
.md-content :deep(td) {
  border: 1px solid #d1d9e0;
  padding: 6px 13px;
}
.md-content :deep(th) {
  font-weight: 600;
  background: #f6f8fa;
}
.md-content :deep(tr:nth-child(2n)) {
  background: #f6f8fa;
}
.md-content :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background: #d1d9e0;
  border: 0;
}
.md-content :deep(.task-item) {
  list-style: none;
}
.md-content :deep(.task-item input) {
  margin-right: 0.4em;
  accent-color: #0969da;
  transform: scale(1.1);
}

/* 响应式 */
@media (max-width: 820px) {
  .md-panes {
    flex-direction: column;
  }
  .md-pane {
    min-height: 220px;
  }
}
</style>
