<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useToolsStore } from '../stores/tools'

const store = useToolsStore()
const KEY = 'stopwatch'

interface StopState {
  mode: 'forward' | 'countdown'
  cdH: number
  cdM: number
  cdS: number
}

const state = computed(() =>
  store.getData<StopState>(KEY, { mode: 'forward', cdH: 0, cdM: 5, cdS: 0 }),
)

function update(patch: Partial<StopState>) {
  store.setData(KEY, { ...state.value, ...patch })
}

// ===== 运行时状态（不持久化，避免每秒写入） =====
const totalSeconds = ref(0)
const maxCd = ref(300)
const isRunning = ref(false)
const isPaused = ref(false)
const ended = ref(false)
let timerId: number | undefined
let audioCtx: AudioContext | null = null

// ===== 工具函数 =====
function formatTime(sec: number): string {
  if (sec < 0) sec = 0
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function parseSecs(h: number, m: number, s: number): number {
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
}
function numFix(e: Event): number {
  const v = Number((e.target as HTMLInputElement).value)
  return Number.isNaN(v) ? 0 : Math.floor(v)
}

const displayTime = computed(() => formatTime(totalSeconds.value))
const warning = computed(
  () => state.value.mode === 'countdown' && totalSeconds.value <= 5 && totalSeconds.value > 0,
)
const statusClass = computed(() => {
  if (state.value.mode === 'countdown' && ended.value) return 'ended'
  if (isRunning.value) return 'running'
  if (isPaused.value) return 'stopped'
  return 'stopped'
})
const statusText = computed(() => {
  if (state.value.mode === 'countdown' && ended.value) return '⏰ 时间到!'
  if (isRunning.value) return '● 运行中'
  if (isPaused.value) return '⏸ 暂停'
  return '● 停止'
})

// 按钮状态
const startDisabled = computed(() => isRunning.value)
const pauseDisabled = computed(() => {
  if (state.value.mode === 'countdown' && ended.value) return true
  return !isRunning.value && !isPaused.value
})
const startText = computed(() => {
  if (state.value.mode === 'countdown' && ended.value) return '↻ 重开'
  if (isPaused.value) return '▶ 继续'
  return '▶ 开始'
})

// ===== 提示音引擎（Web Audio，C5-E5-G5 上升三音） =====
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    return audioCtx
  } catch {
    return null
  }
}
function doPlay(ctx: AudioContext) {
  const now = ctx.currentTime
  const freqs = [523.25, 659.25, 783.99] // C5 E5 G5
  const durs = [0.18, 0.18, 0.28]
  const gaps = [0.15, 0.15, 0]
  const base = 0.22
  let t = now + 0.05
  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freqs[i], t)
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(base, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + durs[i])
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + durs[i])
    t += durs[i] + gaps[i]
  }
}
function playAlert() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().then(() => doPlay(ctx)).catch(() => {})
  else doPlay(ctx)
}

// ===== 核心逻辑 =====
function stopTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = undefined
  }
  isRunning.value = false
  isPaused.value = false
}
function startTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = undefined
  }
  if (state.value.mode === 'countdown' && totalSeconds.value <= 0) {
    totalSeconds.value = maxCd.value > 0 ? maxCd.value : 300
  }
  ended.value = false
  isRunning.value = true
  isPaused.value = false

  timerId = window.setInterval(() => {
    if (state.value.mode === 'forward') {
      totalSeconds.value += 1
    } else {
      totalSeconds.value -= 1
      if (totalSeconds.value <= 0) {
        totalSeconds.value = 0
        if (timerId) clearInterval(timerId)
        timerId = undefined
        isRunning.value = false
        isPaused.value = false
        ended.value = true
        playAlert()
        setTimeout(playAlert, 450)
        setTimeout(playAlert, 900)
        setTimeout(playAlert, 1350)
      }
    }
  }, 1000)
}
function pauseTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = undefined
    isRunning.value = false
    isPaused.value = true
  }
}
function resetTimer() {
  stopTimer()
  isPaused.value = false
  ended.value = false
  totalSeconds.value = state.value.mode === 'forward' ? 0 : maxCd.value > 0 ? maxCd.value : 300
}
function applyCd() {
  let sec = parseSecs(state.value.cdH, state.value.cdM, state.value.cdS)
  if (sec < 1) sec = 1
  if (sec > 86400) sec = 86400
  maxCd.value = sec
  if (state.value.mode === 'countdown' && !isRunning.value) {
    totalSeconds.value = maxCd.value
    ended.value = false
  }
}
function switchMode(mode: 'forward' | 'countdown') {
  if (mode === state.value.mode) return
  stopTimer()
  isPaused.value = false
  ended.value = false
  update({ mode })
  if (mode === 'forward') {
    totalSeconds.value = 0
  } else {
    applyCd()
  }
}

// ===== 事件 =====
function onStart() {
  if (isRunning.value) return
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  startTimer()
}
function onPause() {
  if (isRunning.value) pauseTimer()
  else if (isPaused.value) startTimer()
}
function onReset() {
  resetTimer()
}
function onSet() {
  applyCd()
}
function onTest() {
  playAlert()
  setTimeout(playAlert, 450)
  setTimeout(playAlert, 900)
  setTimeout(playAlert, 1350)
}

function onKey(e: KeyboardEvent) {
  const el = document.activeElement
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
  if (e.code === 'Space') {
    e.preventDefault()
    if (isRunning.value) onPause()
    else onStart()
  } else if (e.code === 'KeyR') {
    onReset()
  }
}

onMounted(() => {
  if (state.value.mode === 'countdown') applyCd()
  else totalSeconds.value = 0
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  if (timerId) clearInterval(timerId)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="stopwatch-tool">
    <div class="card">
      <!-- 头部 -->
      <div class="header">
        <h1>
          ⏱ 秒表
          <span class="tag">正向 · 倒计时</span>
        </h1>
        <div class="mode-toggle">
          <button
            class="mode-btn"
            :class="{ active: state.mode === 'forward' }"
            @click="switchMode('forward')"
          >
            ▶ 正向
          </button>
          <button
            class="mode-btn"
            :class="{ active: state.mode === 'countdown' }"
            @click="switchMode('countdown')"
          >
            ⏳ 倒计时
          </button>
        </div>
      </div>

      <!-- 时间显示 -->
      <div class="timer-display">
        <div class="glow"></div>
        <div id="timeDisplay" class="time" :class="{ warning }">{{ displayTime }}</div>
        <div class="timer-sub">
          <span class="status-badge" :class="statusClass">{{ statusText }}</span>
        </div>
      </div>

      <!-- 倒计时设置 -->
      <div class="countdown-setup" :class="{ visible: state.mode === 'countdown' }">
        <div class="field">
          <label>时</label>
          <input
            type="number"
            :value="state.cdH"
            min="0"
            max="99"
            @input="update({ cdH: Math.max(0, Math.min(99, numFix($event))) })"
          />
        </div>
        <div class="field">
          <label>分</label>
          <input
            type="number"
            :value="state.cdM"
            min="0"
            max="59"
            @input="update({ cdM: Math.max(0, Math.min(59, numFix($event))) })"
          />
        </div>
        <div class="field">
          <label>秒</label>
          <input
            type="number"
            :value="state.cdS"
            min="0"
            max="59"
            @input="update({ cdS: Math.max(0, Math.min(59, numFix($event))) })"
          />
        </div>
        <button class="set-btn" @click="onSet">设定</button>
      </div>

      <!-- 控制按钮 -->
      <div class="controls">
        <button class="ctrl-btn primary" :disabled="startDisabled" @click="onStart">
          {{ startText }}
        </button>
        <button class="ctrl-btn outline" :disabled="pauseDisabled" @click="onPause">⏸ 暂停</button>
        <button class="ctrl-btn outline" @click="onReset">⟲ 重置</button>
      </div>

      <!-- 脚注 -->
      <div class="footer" style="display:none;">
        <span>🔔 倒计时结束自动响铃 (C5-E5-G5)</span>
        <button class="test-sound" @click="onTest">🔊 测试提示音</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stopwatch-tool {
  width: 100%;
  align-self: stretch;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  width: 100%;
  max-width: 560px;
  background: var(--panel, #fff);
  border: 1.5px solid var(--border);
  border-radius: 32px;
  padding: 32px 36px 36px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}

/* 头部 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-h);
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.header h1 .tag {
  background: var(--accent-bg);
  color: var(--accent);
  padding: 3px 12px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
}
.mode-toggle {
  display: flex;
  background: var(--bg-soft);
  border-radius: 40px;
  padding: 4px;
  border: 1px solid var(--border);
}
.mode-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 30px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--text);
  transition: all 0.2s ease;
}
.mode-btn.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 14px var(--accent-border);
}
.mode-btn:not(.active):hover {
  color: var(--text-h);
}

/* 时间显示 */
.timer-display {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 30px 20px 26px;
  margin-bottom: 18px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 4px 18px rgba(0, 0, 0, 0.04);
}
.timer-display .glow {
  position: absolute;
  top: -40%;
  left: -20%;
  width: 140%;
  height: 140%;
  background: radial-gradient(circle at center, var(--accent-border) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0.7;
}
.time {
  font-family: var(--mono);
  font-size: 76px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--text-h);
  line-height: 1.15;
  position: relative;
  z-index: 2;
}
.time.warning {
  color: var(--error);
  animation: pulse-warning 1s ease-in-out infinite;
}
@keyframes pulse-warning {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.timer-sub {
  margin-top: 8px;
  position: relative;
  z-index: 2;
}
.status-badge {
  display: inline-block;
  padding: 3px 16px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-soft);
  color: var(--text);
}
.status-badge.running {
  background: var(--accent-bg);
  color: var(--accent);
}
.status-badge.ended {
  background: rgba(229, 72, 77, 0.12);
  color: var(--error);
}

/* 倒计时设置 */
.countdown-setup {
  display: none;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
  background: var(--bg-soft);
  padding: 16px 20px;
  border-radius: 20px;
  border: 1px solid var(--border);
}
.countdown-setup.visible {
  display: flex;
}
.countdown-setup .field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.countdown-setup .field label {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text);
  font-weight: 600;
}
.countdown-setup .field input {
  width: 70px;
  padding: 8px 6px;
  text-align: center;
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  color: var(--text-h);
  font-size: 20px;
  font-weight: 600;
  font-family: var(--mono);
  outline: none;
  transition: border 0.18s ease, box-shadow 0.18s ease;
}
.countdown-setup .field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
.countdown-setup .field input::-webkit-outer-spin-button,
.countdown-setup .field input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
.countdown-setup .field input {
  -moz-appearance: textfield;
}
.set-btn {
  padding: 8px 24px;
  border: none;
  border-radius: 30px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  align-self: flex-end;
  margin-bottom: 2px;
  transition: filter 0.16s ease, transform 0.1s ease;
}
.set-btn:hover {
  filter: brightness(1.06);
}
.set-btn:active {
  transform: scale(0.97);
}

/* 控制按钮 */
.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 6px;
}
.ctrl-btn {
  padding: 12px 34px;
  border: 1px solid var(--border);
  border-radius: 40px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  color: var(--text-h);
  min-width: 110px;
  justify-content: center;
  transition: transform 0.1s ease, filter 0.16s ease, background 0.16s ease, border-color 0.16s ease,
    opacity 0.16s ease;
}
.ctrl-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}
.ctrl-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ctrl-btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 4px 18px var(--accent-border);
}
.ctrl-btn.primary:hover:not(:disabled) {
  filter: brightness(1.06);
}
.ctrl-btn.outline {
  background: transparent;
}
.ctrl-btn.outline:hover:not(:disabled) {
  background: var(--bg-soft);
  border-color: var(--accent);
}

/* 脚注 */
.footer {
  margin-top: 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--text);
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.test-sound {
  background: transparent;
  border: none;
  color: var(--text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline dotted;
  transition: color 0.18s ease;
}
.test-sound:hover {
  color: var(--accent);
}

@media (max-width: 560px) {
  .card {
    padding: 24px 18px 28px;
    border-radius: 24px;
  }
  .time {
    font-size: 52px;
    letter-spacing: 2px;
  }
  .header h1 {
    font-size: 18px;
  }
  .ctrl-btn {
    flex: 1;
    padding: 10px 16px;
    font-size: 13px;
    min-width: 80px;
  }
  .countdown-setup .field input {
    width: 56px;
    font-size: 17px;
  }
}
@media (max-width: 420px) {
  .time {
    font-size: 40px;
  }
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  .mode-toggle {
    align-self: stretch;
  }
  .mode-btn {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .time.warning {
    animation: none;
  }
  .ctrl-btn:hover:not(:disabled),
  .ctrl-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
