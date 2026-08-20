<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'timestamp'

interface TsState {
  ts: string
  dateStr: string
  unit: 's' | 'ms'
  follow: boolean
}

const state = computed(() =>
  store.getData<TsState>(KEY, {
    ts: String(Math.floor(Date.now() / 1000)),
    dateStr: '',
    unit: 's',
    follow: false,
  }),
)

const follow = ref(state.value.follow)

// 实时时钟
const liveTs = ref('')
const liveDate = ref('')
const liveUtc = ref('')
const liveInput = ref(state.value.ts)

let timer: number | undefined

function refresh() {
  const n = Date.now()
  const ms = state.value.unit === 's' ? Math.floor(n / 1000) : n
  liveTs.value = String(ms)
  liveInput.value = String(ms)
  const d = new Date(n)
  liveDate.value = d.toLocaleString('zh-CN', { hour12: false })
  liveUtc.value = d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
}

onMounted(() => {
  refresh()
  timer = window.setInterval(refresh, 1000)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

const toDate = computed(() => {
  const rawStr = follow.value ? liveInput.value : state.value.ts
  const raw = Number(rawStr)
  if (!rawStr || Number.isNaN(raw)) return ''
  const ms = state.value.unit === 's' ? raw * 1000 : raw
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { hour12: false })
})

function update(patch: Partial<TsState>) {
  store.setData(KEY, { ...state.value, ...patch })
}
function now() {
  const n = Date.now()
  update({ ts: String(state.value.unit === 's' ? Math.floor(n / 1000) : n) })
}
function toggleFollow(e: Event) {
  follow.value = (e.target as HTMLInputElement).checked
  update({ follow: follow.value })
}
</script>

<template>
  <div class="tool-body">
    <!-- 实时时钟卡片 -->
    <div class="live-card">
      <div class="live-top">
        <span class="live-dot"></span>
        <span class="live-title"><span class="i-mingcute-clock-line"></span> 实时时间</span>
        <label class="live-switch">
          <input type="checkbox" :checked="follow" @change="toggleFollow" />
          <span>实时跟随输入</span>
        </label>
      </div>
      <div class="live-ts mono">{{ liveTs }}</div>
      <div class="live-meta">
        <span class="live-date">{{ liveDate }}</span>
        <span class="live-utc mono">{{ liveUtc }}</span>
      </div>
    </div>

    <div class="row">
      <label>单位</label>
      <select
        :value="state.unit"
        class="input"
        @change="update({ unit: ($event.target as HTMLSelectElement).value as 's' | 'ms' })"
      >
        <option value="s">秒 (s)</option>
        <option value="ms">毫秒 (ms)</option>
      </select>
      <button class="btn" @click="now">
        <span class="i-mingcute-refresh-2-line"></span> 现在
      </button>
    </div>

    <label class="block"><span class="i-mingcute-clock-line blk-ic"></span> 时间戳 → 日期</label>
    <input
      class="input mono"
      :readonly="follow"
      :value="follow ? liveInput : state.ts"
      @input="update({ ts: ($event.target as HTMLInputElement).value })"
    />
    <pre class="input mono out">{{ toDate || '无效时间戳' }}</pre>

    <label class="block"><span class="i-mingcute-calendar-line blk-ic"></span> 日期 → 时间戳</label>
    <input
      class="input"
      type="datetime-local"
      :value="state.dateStr"
      @input="update({ dateStr: ($event.target as HTMLInputElement).value })"
    />
  </div>
</template>

<style scoped>
.live-card {
  border: 1.5px solid var(--accent-border);
  border-radius: 16px;
  padding: 16px 18px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, var(--accent-bg), rgba(255, 107, 157, 0.08));
}
.live-top {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.live-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--success, #2f9e44);
  animation: livePulse 1.6s infinite;
}
@keyframes livePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(47, 158, 68, 0.5);
  }
  70% {
    box-shadow: 0 0 0 7px rgba(47, 158, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(47, 158, 68, 0);
  }
}
.live-title {
  font-weight: 600;
  color: var(--text-h);
  display: flex;
  align-items: center;
  gap: 4px;
}
.live-switch {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text);
  user-select: none;
}
.live-switch input {
  accent-color: var(--accent);
  cursor: pointer;
}
.live-ts {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--color-primary-dark);
  line-height: 1.25;
  word-break: break-all;
}
.live-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.live-date {
  font-weight: 600;
  color: var(--text-h);
}
.live-utc {
  font-size: 11px;
}
</style>
