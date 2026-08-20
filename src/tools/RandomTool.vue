<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'random'

interface RandState {
  type: 'int' | 'float'
  count: number
  min: number
  max: number
  decimals: number
  unique: boolean
  sort: 'none' | 'asc' | 'desc'
  separator: 'newline' | 'comma' | 'space' | 'custom'
  customSep: string
  exclude: string
  result: string
}

const state = computed(() =>
  store.getData<RandState>(KEY, {
    type: 'int',
    count: 10,
    min: 1,
    max: 100,
    decimals: 2,
    unique: false,
    sort: 'none',
    separator: 'newline',
    customSep: ',',
    exclude: '',
    result: '',
  }),
)

function update(patch: Partial<RandState>) {
  store.setData(KEY, { ...state.value, ...patch })
}
function numOr(v: string, fallback: number): number {
  if (v.trim() === '') return fallback
  const n = Number(v)
  return Number.isNaN(n) ? fallback : n
}

// 当前实际分隔符
const realSep = computed(() => {
  const s = state.value.separator
  if (s === 'newline') return '\n'
  if (s === 'comma') return ','
  if (s === 'space') return ' '
  return state.value.customSep
})
const resultCount = computed(() =>
  state.value.result ? state.value.result.split(realSep.value || '\n').filter((x) => x !== '').length : 0,
)

const showMore = ref(false)

const toastMsg = ref('')
let toastTimer: number | undefined
function toast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastMsg.value = ''), 1800)
}

function parseExcludes(): Set<number> {
  const set = new Set<number>()
  const raw = state.value.exclude.trim()
  if (!raw) return set
  for (const part of raw.split(/[,\s]+/)) {
    if (part === '') continue
    const n = Number(part)
    if (!Number.isNaN(n)) set.add(n)
  }
  return set
}

function generate() {
  const s = state.value
  const count = Math.floor(s.count)
  if (!(count >= 1 && count <= 10000)) {
    toast('生成数量需在 1 ~ 10000 之间')
    return
  }
  if (s.min >= s.max) {
    toast('最小值必须小于最大值')
    return
  }
  const ex = parseExcludes()
  const nums: number[] = []
  let guard = 0
  const GUARD = count * 1000 + 200000

  if (s.type === 'int') {
    const lo = Math.ceil(s.min)
    const hi = Math.floor(s.max)
    if (lo >= hi) {
      toast('整数区间内没有有效数字')
      return
    }
    const avail = hi - lo - ex.size
    if (s.unique && avail < count) {
      toast('范围内不重复整数不足')
      return
    }
    const seen = new Set<number>()
    while (nums.length < count && guard++ < GUARD) {
      const v = Math.floor(Math.random() * (hi - lo)) + lo
      if (ex.has(v)) continue
      if (s.unique && seen.has(v)) continue
      seen.add(v)
      nums.push(v)
    }
  } else {
    if (s.unique) {
      const seen = new Set<string>()
      while (nums.length < count && guard++ < GUARD) {
        let v = s.min + Math.random() * (s.max - s.min)
        if (v >= s.max) v = s.max - Number.EPSILON * Math.abs(s.max)
        const k = s.decimals > 0 ? v.toFixed(s.decimals) : String(Math.round(v))
        const n = Number(k)
        if (ex.has(n) || seen.has(k)) continue
        seen.add(k)
        nums.push(n)
      }
    } else {
      while (nums.length < count && guard++ < GUARD) {
        let v = s.min + Math.random() * (s.max - s.min)
        if (v >= s.max) v = s.max - Number.EPSILON * Math.abs(s.max)
        const k = s.decimals > 0 ? v.toFixed(s.decimals) : String(Math.round(v))
        const n = Number(k)
        if (ex.has(n)) continue
        nums.push(n)
      }
    }
  }

  if (nums.length < count) {
    toast('无法生成足够的随机数（范围/排除过小）')
    return
  }

  if (s.sort === 'asc') nums.sort((a, b) => a - b)
  else if (s.sort === 'desc') nums.sort((a, b) => b - a)

  const result = nums.join(realSep.value)
  update({ result })
  toast(`已生成 ${nums.length} 个随机数`)
}

async function copyResult() {
  if (!state.value.result) {
    toast('暂无可复制的结果')
    return
  }
  try {
    await navigator.clipboard.writeText(state.value.result)
    toast('已复制结果')
  } catch {
    toast('复制失败')
  }
}

function download() {
  if (!state.value.result) {
    toast('暂无可下载的结果')
    return
  }
  const blob = new Blob([state.value.result], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'random-numbers.txt'
  a.click()
  URL.revokeObjectURL(url)
  toast('已下载 random-numbers.txt')
}

function onNum(field: 'count' | 'min' | 'max' | 'decimals', e: Event) {
  const v = (e.target as HTMLInputElement).value
  const map: Record<string, number> = { count: 10, min: 1, max: 100, decimals: 2 }
  update({ [field]: numOr(v, map[field]) } as Partial<RandState>)
}
</script>

<template>
  <div class="random-tool">
    <!-- 参数：单列，每个一行 -->
    <div class="form">
      <div class="form-group">
        <label>生成数量 <span class="hint">1 – 10000</span></label>
        <input class="input" type="number" min="1" max="10000" :value="state.count" @input="onNum('count', $event)" />
      </div>

      <div class="form-group">
        <label>数字类型</label>
        <select
          class="input"
          :value="state.type"
          @change="update({ type: ($event.target as HTMLSelectElement).value as 'int' | 'float' })"
        >
          <option value="int">整数</option>
          <option value="float">浮点数（小数）</option>
        </select>
      </div>

      <div class="form-group">
        <label>最小值</label>
        <input class="input" type="number" :value="state.min" @input="onNum('min', $event)" />
      </div>

      <div class="form-group">
        <label>最大值 <span class="hint">不含，区间 [min, max)</span></label>
        <input class="input" type="number" :value="state.max" @input="onNum('max', $event)" />
      </div>

      <div class="form-group" v-if="state.type === 'float'">
        <label>小数点位数 <span class="hint">0 – 1000</span></label>
        <input class="input" type="number" min="0" max="1000" :value="state.decimals" @input="onNum('decimals', $event)" />
      </div>

      <div class="form-group">
        <label>数字唯一</label>
        <select
          class="input"
          :value="state.unique ? 'true' : 'false'"
          @change="update({ unique: ($event.target as HTMLSelectElement).value === 'true' })"
        >
          <option value="false">允许重复</option>
          <option value="true">不允许重复</option>
        </select>
      </div>
    </div>

    <!-- 更多参数（默认折叠） -->
    <button class="more-toggle" :class="{ open: showMore }" @click="showMore = !showMore">
      <span>更多参数</span>
      <span class="chev" :class="showMore ? 'i-mingcute-up-line' : 'i-mingcute-down-line'"></span>
    </button>
    <div class="collapse" :class="{ open: showMore }">
      <div class="collapse-inner">
        <div class="form-group">
          <label>排序方式</label>
          <select
            class="input"
            :value="state.sort"
            @change="update({ sort: ($event.target as HTMLSelectElement).value as 'none' | 'asc' | 'desc' })"
          >
            <option value="none">无序</option>
            <option value="asc">升序（从小到大）</option>
            <option value="desc">降序（从大到小）</option>
          </select>
        </div>

        <div class="form-group">
          <label>结果分隔符</label>
          <select
            class="input"
            :value="state.separator"
            @change="update({ separator: ($event.target as HTMLSelectElement).value as RandState['separator'] })"
          >
            <option value="newline">换行</option>
            <option value="comma">逗号 ,</option>
            <option value="space">空格</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <div class="form-group" v-if="state.separator === 'custom'">
          <label>自定义分隔符</label>
          <input class="input" :value="state.customSep" placeholder="如 | 或 ::" @input="update({ customSep: ($event.target as HTMLInputElement).value })" />
        </div>

        <div class="form-group">
          <label>排除数字 <span class="hint">逗号或空格分隔，生成时跳过</span></label>
          <input class="input" :value="state.exclude" placeholder="如 4, 7, 13" @input="update({ exclude: ($event.target as HTMLInputElement).value })" />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn btn-primary" @click="generate">
        <span class="i-mingcute-flash-line"></span> 生成
      </button>
      <button class="btn btn-success" @click="copyResult">
        <span class="i-mingcute-copy-2-line"></span> 复制结果
      </button>
      <button class="btn btn-outline" @click="download">
        <span class="i-mingcute-download-2-line"></span> 下载到文件
      </button>
    </div>

    <!-- 结果区：撑满剩余高度 -->
    <div class="result-area">
      <div class="label-row">
        <label><span class="i-mingcute-document-line"></span> 生成结果</label>
        <span class="count-badge" v-if="state.result">共 {{ resultCount }} 个</span>
      </div>
      <pre class="input mono area out scroll">{{ state.result || '' }}</pre>
    </div>

    <!-- 脚注 -->
    <div class="footnote">
      <span><i class="i-mingcute-diamond-fill"></i> 范围 [最小值, 最大值)</span>
      <span><i class="i-mingcute-diamond-fill"></i> 浮点数最多 1000 位小数</span>
      <span><i class="i-mingcute-diamond-fill"></i> 唯一性：自动去重</span>
    </div>

    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<style scoped>
/* 铺满内容区 */
.random-tool {
  width: 100%;
  align-self: stretch;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 表单：单列，每个参数一行 */
.form {
  display: flex;
  flex-direction: column;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 14px;
}
.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}
.form-group label .hint {
  font-weight: 400;
  font-size: 12px;
  color: var(--text);
  opacity: 0.6;
  margin-left: 4px;
}

/* 更多参数：折叠开关 + 平滑展开 */
.more-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  margin: 4px 0 14px;
  padding: 11px 16px;
  border: 1.5px solid var(--border);
  background: #fff;
  color: var(--accent);
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.1s ease;
}
.more-toggle:hover {
  border-color: var(--accent);
  background: var(--accent-bg);
}
.more-toggle:active {
  transform: scale(0.99);
}
.more-toggle .chev {
  font-size: 16px;
  transition: transform 0.25s ease;
}
.collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.collapse.open {
  grid-template-rows: 1fr;
}
.collapse-inner {
  overflow: hidden;
  min-height: 0;
}
.collapse.open .collapse-inner {
  margin-bottom: 4px;
}
.input {
  padding: 11px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font: inherit;
  font-size: 15px;
  background: #fff;
  color: var(--text-h);
  width: 100%;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-border);
}
.input::placeholder {
  color: var(--text);
  opacity: 0.5;
}

/* 按钮区 */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 22px 0;
}
.btn {
  padding: 11px 30px;
  border: none;
  border-radius: 10px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.1s ease, filter 0.16s ease, background 0.16s ease;
}
.btn span {
  font-size: 17px;
}
.btn:active {
  transform: scale(0.97);
}
.btn-primary {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 12px var(--accent-border);
}
.btn-primary:hover {
  filter: brightness(1.06);
}
.btn-success {
  background: var(--success);
  color: #fff;
  box-shadow: 0 4px 12px rgba(34, 181, 115, 0.25);
}
.btn-success:hover {
  filter: brightness(1.05);
}
.btn-outline {
  background: transparent;
  border: 1.5px solid var(--border);
  color: var(--text-h);
}
.btn-outline:hover {
  background: var(--bg-soft);
  border-color: var(--accent);
}

/* 结果区：撑满剩余高度 */
.result-area {
  flex: 1 1 auto;
  min-height: 140px;
  display: flex;
  flex-direction: column;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.label-row label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.label-row label span[class^='i-mingcute'] {
  color: var(--accent);
  font-size: 16px;
}
.count-badge {
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-soft);
  padding: 2px 14px;
  border-radius: 30px;
}
.area {
  flex: 1 1 auto;
  min-height: 140px;
  margin: 0;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 18px 22px;
  background: var(--bg-soft);
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-h);
  white-space: pre-wrap;
  word-break: break-all;
}
.area:empty::before {
  content: '点击「生成」按钮，随机数将显示在这里';
  color: var(--text);
  opacity: 0.55;
}

/* 脚注 */
.footnote {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
}
.footnote span {
  background: var(--bg-soft);
  padding: 3px 12px;
  border-radius: 30px;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--text-h);
  color: #fff;
  padding: 12px 22px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: var(--shadow);
  z-index: 9999;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (max-width: 560px) {
  .actions {
    flex-direction: column;
  }
  .actions .btn {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn:active {
    transform: none;
  }
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.2s ease;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: translateX(-50%);
  }
}
</style>
