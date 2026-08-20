<script setup lang="ts">
import { computed } from 'vue'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'timestamp'

interface TsState {
  ts: string
  dateStr: string
  unit: 's' | 'ms'
}

const state = computed(() =>
  store.getData<TsState>(KEY, { ts: String(Math.floor(Date.now() / 1000)), dateStr: '', unit: 's' }),
)

const toDate = computed(() => {
  const raw = Number(state.value.ts)
  if (!state.value.ts || Number.isNaN(raw)) return ''
  const ms = state.value.unit === 's' ? raw * 1000 : raw
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { hour12: false })
})

const now = () => {
  const n = Date.now()
  update({ ts: String(state.value.unit === 's' ? Math.floor(n / 1000) : n) })
}

function update(patch: Partial<TsState>) {
  store.setData(KEY, { ...state.value, ...patch })
}
</script>

<template>
  <div class="tool-body">
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
      class="input"
      :value="state.ts"
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
