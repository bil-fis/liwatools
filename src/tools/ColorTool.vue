<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'color'

interface ColorState {
  hex: string // #RRGGBB 或 #RRGGBBAA
  alpha: number // 0~1
  query: string
}

const state = computed(() =>
  store.getData<ColorState>(KEY, {
    hex: '#ffc24b',
    alpha: 1,
    query: '',
  }),
)

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const toHex2 = (n: number) =>
  clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase()

function parseHex(hex: string): { r: number; g: number; b: number; a: number } | null {
  let s = hex.trim()
  if (s.startsWith('#')) s = s.slice(1)
  if (/^[0-9a-fA-F]{3}$/.test(s))
    return { r: parseInt(s[0] + s[0], 16), g: parseInt(s[1] + s[1], 16), b: parseInt(s[2] + s[2], 16), a: 1 }
  if (/^[0-9a-fA-F]{6}$/.test(s))
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16), a: 1 }
  if (/^[0-9a-fA-F]{8}$/.test(s))
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: clamp(parseInt(s.slice(6, 8), 16) / 255, 0, 1),
    }
  return null
}

function parseRgb(str: string) {
  const s = str.trim().replace(/\s/g, '')
  let m = s.match(/^rgb\((\d+),(\d+),(\d+)\)$/i)
  if (m) return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255) }
  m = s.match(/^(\d+),(\d+),(\d+)$/)
  if (m) return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255) }
  return null
}

function parseRgba(str: string) {
  const s = str.trim().replace(/\s/g, '')
  let m = s.match(/^rgba\((\d+),(\d+),(\d+),([0-9.]+)\)$/i)
  if (m)
    return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255), a: clamp(+m[4], 0, 1) }
  m = s.match(/^(\d+),(\d+),(\d+),([0-9.]+)$/)
  if (m)
    return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255), a: clamp(+m[4], 0, 1) }
  return null
}

const rgb = computed(() => {
  const p = parseHex(state.value.hex)
  if (!p) return null
  return { r: p.r, g: p.g, b: p.b }
})

const cssRgba = computed(() => {
  const c = rgb.value
  if (!c) return 'transparent'
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${state.value.alpha})`
})

const hex6 = computed(() =>
  rgb.value ? `#${toHex2(rgb.value.r)}${toHex2(rgb.value.g)}${toHex2(rgb.value.b)}` : '#000000',
)
const hex8 = computed(() =>
  rgb.value
    ? `${hex6.value}${toHex2(state.value.alpha * 255)}`
    : '#000000',
)
const rgbText = computed(() =>
  rgb.value ? `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})` : '',
)
const rgbaText = computed(() =>
  rgb.value ? `rgba(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b}, ${state.value.alpha.toFixed(2)})` : '',
)

function update(patch: Partial<ColorState>) {
  store.setData(KEY, { ...state.value, ...patch })
}

function applyRgba(r: number, g: number, b: number, a: number, keepAlpha = false) {
  const a2 = keepAlpha ? state.value.alpha : a
  update({
    hex: `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`,
    alpha: a2,
  })
}

const CSS_COLORS = [
  { name: 'aliceblue', hex: '#F0F8FF' }, { name: 'antiquewhite', hex: '#FAEBD7' },
  { name: 'aqua', hex: '#00FFFF' }, { name: 'aquamarine', hex: '#7FFFD4' },
  { name: 'azure', hex: '#F0FFFF' }, { name: 'beige', hex: '#F5F5DC' },
  { name: 'bisque', hex: '#FFE4C4' }, { name: 'black', hex: '#000000' },
  { name: 'blanchedalmond', hex: '#FFEBCD' }, { name: 'blue', hex: '#0000FF' },
  { name: 'blueviolet', hex: '#8A2BE2' }, { name: 'brown', hex: '#A52A2A' },
  { name: 'burlywood', hex: '#DEB887' }, { name: 'cadetblue', hex: '#5F9EA0' },
  { name: 'chartreuse', hex: '#7FFF00' }, { name: 'chocolate', hex: '#D2691E' },
  { name: 'coral', hex: '#FF7F50' }, { name: 'cornflowerblue', hex: '#6495ED' },
  { name: 'cornsilk', hex: '#FFF8DC' }, { name: 'crimson', hex: '#DC143C' },
  { name: 'cyan', hex: '#00FFFF' }, { name: 'darkblue', hex: '#00008B' },
  { name: 'darkcyan', hex: '#008B8B' }, { name: 'darkgoldenrod', hex: '#B8860B' },
  { name: 'darkgray', hex: '#A9A9A9' }, { name: 'darkgreen', hex: '#006400' },
  { name: 'darkkhaki', hex: '#BDB76B' }, { name: 'darkmagenta', hex: '#8B008B' },
  { name: 'darkolivegreen', hex: '#556B2F' }, { name: 'darkorange', hex: '#FF8C00' },
  { name: 'darkorchid', hex: '#9932CC' }, { name: 'darkred', hex: '#8B0000' },
  { name: 'darksalmon', hex: '#E9967A' }, { name: 'darkseagreen', hex: '#8FBC8F' },
  { name: 'darkslateblue', hex: '#483D8B' }, { name: 'darkslategray', hex: '#2F4F4F' },
  { name: 'darkturquoise', hex: '#00CED1' }, { name: 'darkviolet', hex: '#9400D3' },
  { name: 'deeppink', hex: '#FF1493' }, { name: 'deepskyblue', hex: '#00BFFF' },
  { name: 'dimgray', hex: '#696969' }, { name: 'dodgerblue', hex: '#1E90FF' },
  { name: 'firebrick', hex: '#B22222' }, { name: 'floralwhite', hex: '#FFFAF0' },
  { name: 'forestgreen', hex: '#228B22' }, { name: 'fuchsia', hex: '#FF00FF' },
  { name: 'gainsboro', hex: '#DCDCDC' }, { name: 'ghostwhite', hex: '#F8F8FF' },
  { name: 'gold', hex: '#FFD700' }, { name: 'goldenrod', hex: '#DAA520' },
  { name: 'gray', hex: '#808080' }, { name: 'green', hex: '#008000' },
  { name: 'greenyellow', hex: '#ADFF2F' }, { name: 'honeydew', hex: '#F0FFF0' },
  { name: 'hotpink', hex: '#FF69B4' }, { name: 'indianred', hex: '#CD5C5C' },
  { name: 'indigo', hex: '#4B0082' }, { name: 'ivory', hex: '#FFFFF0' },
  { name: 'khaki', hex: '#F0E68C' }, { name: 'lavender', hex: '#E6E6FA' },
  { name: 'lavenderblush', hex: '#FFF0F5' }, { name: 'lawngreen', hex: '#7CFC00' },
  { name: 'lemonchiffon', hex: '#FFFACD' }, { name: 'lightblue', hex: '#ADD8E6' },
  { name: 'lightcoral', hex: '#F08080' }, { name: 'lightcyan', hex: '#E0FFFF' },
  { name: 'lightgoldenrodyellow', hex: '#FAFAD2' }, { name: 'lightgray', hex: '#D3D3D3' },
  { name: 'lightgreen', hex: '#90EE90' }, { name: 'lightpink', hex: '#FFB6C1' },
  { name: 'lightsalmon', hex: '#FFA07A' }, { name: 'lightseagreen', hex: '#20B2AA' },
  { name: 'lightskyblue', hex: '#87CEFA' }, { name: 'lightslategray', hex: '#778899' },
  { name: 'lightsteelblue', hex: '#B0C4DE' }, { name: 'lightyellow', hex: '#FFFFE0' },
  { name: 'lime', hex: '#00FF00' }, { name: 'limegreen', hex: '#32CD32' },
  { name: 'linen', hex: '#FAF0E6' }, { name: 'magenta', hex: '#FF00FF' },
  { name: 'maroon', hex: '#800000' }, { name: 'mediumaquamarine', hex: '#66CDAA' },
  { name: 'mediumblue', hex: '#0000CD' }, { name: 'mediumorchid', hex: '#BA55D3' },
  { name: 'mediumpurple', hex: '#9370DB' }, { name: 'mediumseagreen', hex: '#3CB371' },
  { name: 'mediumslateblue', hex: '#7B68EE' }, { name: 'mediumspringgreen', hex: '#00FA9A' },
  { name: 'mediumturquoise', hex: '#48D1CC' }, { name: 'mediumvioletred', hex: '#C71585' },
  { name: 'midnightblue', hex: '#191970' }, { name: 'mintcream', hex: '#F5FFFA' },
  { name: 'mistyrose', hex: '#FFE4E1' }, { name: 'moccasin', hex: '#FFE4B5' },
  { name: 'navajowhite', hex: '#FFDEAD' }, { name: 'navy', hex: '#000080' },
  { name: 'oldlace', hex: '#FDF5E6' }, { name: 'olive', hex: '#808000' },
  { name: 'olivedrab', hex: '#6B8E23' }, { name: 'orange', hex: '#FFA500' },
  { name: 'orangered', hex: '#FF4500' }, { name: 'orchid', hex: '#DA70D6' },
  { name: 'palegoldenrod', hex: '#EEE8AA' }, { name: 'palegreen', hex: '#98FB98' },
  { name: 'paleturquoise', hex: '#AFEEEE' }, { name: 'palevioletred', hex: '#DB7093' },
  { name: 'papayawhip', hex: '#FFEFD5' }, { name: 'peachpuff', hex: '#FFDAB9' },
  { name: 'peru', hex: '#CD853F' }, { name: 'pink', hex: '#FFC0CB' },
  { name: 'plum', hex: '#DDA0DD' }, { name: 'powderblue', hex: '#B0E0E6' },
  { name: 'purple', hex: '#800080' }, { name: 'rebeccapurple', hex: '#663399' },
  { name: 'red', hex: '#FF0000' }, { name: 'rosybrown', hex: '#BC8F8F' },
  { name: 'royalblue', hex: '#4169E1' }, { name: 'saddlebrown', hex: '#8B4513' },
  { name: 'salmon', hex: '#FA8072' }, { name: 'sandybrown', hex: '#F4A460' },
  { name: 'seagreen', hex: '#2E8B57' }, { name: 'seashell', hex: '#FFF5EE' },
  { name: 'sienna', hex: '#A0522D' }, { name: 'silver', hex: '#C0C0C0' },
  { name: 'skyblue', hex: '#87CEEB' }, { name: 'slateblue', hex: '#6A5ACD' },
  { name: 'slategray', hex: '#708090' }, { name: 'snow', hex: '#FFFAFA' },
  { name: 'springgreen', hex: '#00FF7F' }, { name: 'steelblue', hex: '#4682B4' },
  { name: 'tan', hex: '#D2B48C' }, { name: 'teal', hex: '#008080' },
  { name: 'thistle', hex: '#D8BFD8' }, { name: 'tomato', hex: '#FF6347' },
  { name: 'turquoise', hex: '#40E0D0' }, { name: 'violet', hex: '#EE82EE' },
  { name: 'wheat', hex: '#F5DEB3' }, { name: 'white', hex: '#FFFFFF' },
  { name: 'whitesmoke', hex: '#F5F5F5' }, { name: 'yellow', hex: '#FFFF00' },
  { name: 'yellowgreen', hex: '#9ACD32' },
]

const filteredColors = computed(() => {
  const q = state.value.query.trim().toLowerCase()
  if (!q) return CSS_COLORS
  return CSS_COLORS.filter(
    (c) => c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q),
  )
})

function colorRgb(hex: string) {
  const p = parseHex(hex)!
  return `rgb(${p.r}, ${p.g}, ${p.b})`
}

function pickColor(hex: string) {
  applyRgba(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    1,
  )
  toast(`已选择 ${hex}`)
}

const toastMsg = ref('')
let toastTimer: number | undefined
function toast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastMsg.value = ''), 1800)
}

async function copy(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toast(`已复制 ${text}`)
  } catch {
    toast('复制失败')
  }
}

// 颜色选择器 → 仅改 RGB，保留 alpha
function onPicker(e: Event) {
  const v = (e.target as HTMLInputElement).value
  const p = parseHex(v)
  if (!p) return
  applyRgba(p.r, p.g, p.b, state.value.alpha, true)
}

function onAlpha(e: Event) {
  const a = clamp(parseFloat((e.target as HTMLInputElement).value) || 0, 0, 1)
  update({ alpha: a })
}

function onHexInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (!v.trim()) return
  const p = parseHex(v)
  if (p) applyRgba(p.r, p.g, p.b, p.a)
}

function onRgbInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  const p = parseRgb(v)
  if (p) applyRgba(p.r, p.g, p.b, state.value.alpha, true)
}

function onRgbaInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  const p = parseRgba(v)
  if (p) applyRgba(p.r, p.g, p.b, p.a)
}
</script>

<template>
  <div class="tool-body color-tool">
    <!-- 预览 -->
    <div class="color-preview" :style="{ background: cssRgba }">
      <span class="alpha-tag">{{ state.alpha.toFixed(2) }}</span>
    </div>

    <!-- 控件：选色 + 透明度 -->
    <div class="controls">
      <div class="ctrl">
        <label><span class="i-mingcute-palette-fill ctl-ic"></span> 选色</label>
        <input class="picker" type="color" :value="hex6" @input="onPicker" />
      </div>
      <div class="ctrl grow">
        <label><span class="i-mingcute-sparkles-line ctl-ic"></span> 透明度 {{ state.alpha.toFixed(2) }}</label>
        <input
          class="slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="state.alpha"
          @input="onAlpha"
        />
      </div>
    </div>

    <!-- 输入框 -->
    <div class="fields">
      <div class="field">
        <label class="flabel"><span class="i-mingcute-hashtag-line ctl-ic"></span> HEX <span class="sub">#RRGGBB[AA]</span></label>
        <div class="frow">
          <input
            class="input mono"
            :value="state.alpha < 1 ? hex8 : hex6"
            @input="onHexInput"
            spellcheck="false"
          />
          <button class="copy" @click="copy(state.alpha < 1 ? hex8 : hex6)">
            <span class="i-mingcute-copy-2-line"></span> 复制
          </button>
        </div>
      </div>
      <div class="field">
        <label class="flabel"><span class="i-mingcute-palette-fill ctl-ic"></span> RGB <span class="sub">r, g, b</span></label>
        <div class="frow">
          <input class="input mono" :value="rgbText" @input="onRgbInput" spellcheck="false" />
          <button class="copy" @click="copy(rgbText)">
            <span class="i-mingcute-copy-2-line"></span> 复制
          </button>
        </div>
      </div>
      <div class="field">
        <label class="flabel"><span class="i-mingcute-palette-fill ctl-ic"></span> RGBA <span class="sub">r, g, b, a</span></label>
        <div class="frow">
          <input class="input mono" :value="rgbaText" @input="onRgbaInput" spellcheck="false" />
          <button class="copy" @click="copy(rgbaText)">
            <span class="i-mingcute-copy-2-line"></span> 复制
          </button>
        </div>
      </div>
    </div>

    <!-- 颜色列表 -->
    <div class="list">
      <div class="list-head">
        <span class="list-title"><span class="i-mingcute-grid-line"></span> 全颜色列表 <b>{{ filteredColors.length }}</b></span>
        <input
          class="search"
          :value="state.query"
          @input="update({ query: ($event.target as HTMLInputElement).value })"
          placeholder="搜索名称或 HEX…"
        />
      </div>
      <div class="table-scroll">
        <table class="ctable">
          <thead>
            <tr>
              <th class="c-swatch">色块</th>
              <th>CSS 名称</th>
              <th>十六进制</th>
              <th>RGB</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredColors" :key="c.name" @click="pickColor(c.hex)">
              <td class="c-swatch">
                <span class="swatch" :style="{ background: c.hex }"></span>
              </td>
              <td class="cname">{{ c.name }}</td>
              <td class="chex">{{ c.hex }}</td>
              <td class="crgb">{{ colorRgb(c.hex) }}</td>
            </tr>
            <tr v-if="filteredColors.length === 0">
              <td colspan="4" class="empty">
                <span class="i-mingcute-search-line"></span> 没有找到匹配的颜色
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<style scoped>
.color-tool {
  max-width: 760px;
}

/* 预览 */
.color-preview {
  width: 100%;
  height: 140px;
  border-radius: 20px;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: repeating-conic-gradient(#e8e8e8 0% 25%, #fff 0% 50%);
  background-size: 20px 20px;
  overflow: hidden;
  position: relative;
}
.color-preview > .alpha-tag {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(4px);
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
}

/* 控件 */
.controls {
  display: flex;
  gap: 18px;
  width: 100%;
  align-items: flex-end;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ctrl.grow {
  flex: 1;
}
.ctrl label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-h);
}
.ctl-ic {
  font-size: 15px;
  margin-right: 6px;
  color: var(--accent);
  vertical-align: -2px;
}
.picker {
  width: 56px;
  height: 56px;
  border: 2px solid var(--border);
  border-radius: 14px;
  padding: 2px;
  background: #fff;
  cursor: pointer;
}
.picker::-webkit-color-swatch-wrapper { padding: 0; }
.picker::-webkit-color-swatch { border: none; border-radius: 10px; }
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

/* 输入框 */
.fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.field { width: 100%; }
.flabel {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-h);
  margin-bottom: 8px;
}
.flabel .sub {
  font-weight: 400;
  font-size: 11px;
  color: var(--text);
  opacity: 0.6;
  margin-left: 4px;
}
.frow { display: flex; gap: 12px; }
.frow .input { flex: 1; min-width: 0; }
.copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0 20px;
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 14px;
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.14s ease;
}
.copy span { font-size: 15px; }
.copy:hover { filter: brightness(1.05); }
.copy:active { transform: scale(0.95); }

/* 列表 */
.list { width: 100%; }
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.list-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-h);
}
.list-title span {
  margin-right: 6px;
  color: var(--accent);
  vertical-align: -2px;
}
.list-title b {
  font-weight: 600;
  color: var(--pink);
  opacity: 0.9;
}
.search {
  padding: 10px 16px;
  border: 1.5px solid var(--border);
  border-radius: 14px;
  font: inherit;
  font-size: 14px;
  color: var(--text-h);
  background: #fff;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.search:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-bg); }

.table-scroll {
  max-height: 360px;
  overflow-y: auto;
  border: 1.5px solid var(--border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: var(--shadow);
}
.table-scroll::-webkit-scrollbar { width: 6px; }
.table-scroll::-webkit-scrollbar-track { background: transparent; }
.table-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

.ctable {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.ctable thead th {
  position: sticky;
  top: 0;
  background: var(--bg);
  color: var(--text-h);
  font-weight: 700;
  font-size: 12px;
  text-align: left;
  padding: 12px 16px;
  border-bottom: 2px solid var(--border);
  z-index: 2;
}
.ctable thead th.c-swatch { width: 52px; text-align: center; }
.ctable tbody tr {
  cursor: pointer;
  transition: background 0.14s ease;
  border-bottom: 1px solid rgba(240, 230, 200, 0.6);
}
.ctable tbody tr:hover { background: var(--accent-bg); }
.ctable tbody td {
  padding: 9px 16px;
  font-size: 13px;
  color: var(--text-h);
  vertical-align: middle;
}
.ctable tbody td.c-swatch { text-align: center; }
.swatch {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  display: inline-block;
}
.cname { font-weight: 500; }
.chex, .crgb { font-family: var(--mono); font-size: 12.5px; color: var(--text); }
.empty { text-align: center; padding: 36px; color: var(--text); opacity: 0.6; }
.empty span { margin-right: 6px; }

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
.toast-enter-active, .toast-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

@media (max-width: 560px) {
  .controls { flex-wrap: wrap; }
  .ctrl.grow { width: 100%; }
  .frow { flex-wrap: wrap; }
  .frow .input { width: 100%; }
  .copy { width: 100%; padding: 12px; }
}
</style>
