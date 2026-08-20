<script setup lang="ts">
import { computed } from 'vue'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'base64'

interface B64State {
  input: string
  mode: 'encode' | 'decode'
}

const state = computed(() =>
  store.getData<B64State>(KEY, { input: '', mode: 'encode' }),
)

const output = computed(() => {
  const { input, mode } = state.value
  if (!input) return ''
  try {
    if (mode === 'encode') {
      return btoa(unescape(encodeURIComponent(input)))
    }
    return decodeURIComponent(escape(atob(input)))
  } catch {
    return mode === 'encode' ? '' : '解码失败：不是合法的 Base64'
  }
})

function update(patch: Partial<B64State>) {
  store.setData(KEY, { ...state.value, ...patch })
}

async function copy() {
  if (output.value) await navigator.clipboard.writeText(output.value)
}
</script>

<template>
  <div class="tool-body">
    <div class="row">
      <label>模式</label>
      <select
        :value="state.mode"
        class="input"
        @change="update({ mode: ($event.target as HTMLSelectElement).value as 'encode' | 'decode' })"
      >
        <option value="encode">编码</option>
        <option value="decode">解码</option>
      </select>
      <button class="btn" @click="copy">
        <span class="i-mingcute-copy-2-line"></span> 复制
      </button>
    </div>

    <label class="block"><span class="i-mingcute-pen-line blk-ic"></span> 输入</label>
    <textarea
      class="input mono area"
      :value="state.input"
      :placeholder="state.mode === 'encode' ? '输入文本…' : '输入 Base64…'"
      @input="update({ input: ($event.target as HTMLTextAreaElement).value })"
    ></textarea>

    <label class="block"><span class="i-mingcute-document-line blk-ic"></span> 输出</label>
    <pre class="input mono area out">{{ output || '等待输入…' }}</pre>
  </div>
</template>
