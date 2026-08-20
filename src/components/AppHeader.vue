<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

defineProps<{
  /** 是否移动端布局 */
  isMobile: boolean
}>()
const emit = defineEmits<{
  toggleMobile: []
  toggleTheme: [el: HTMLElement]
}>()

const theme = useThemeStore()
</script>

<template>
  <header class="app-header">
    <!-- 移动端：汉堡按钮打开抽屉 -->
    <button
      v-if="isMobile"
      class="icon-btn"
      aria-label="打开菜单"
      @click="emit('toggleMobile')"
    >
      <span class="i-mingcute-menu-line"></span>
    </button>

    <!-- Logo -->
    <div class="logo">
      <span class="logo-mark i-mingcute-star-fill"></span>
      <span class="logo-text">晚晚工具箱</span>
      <span class="logo-tag">小工具集合</span>
    </div>

    <!-- 主题切换（波纹扩散动画由 App 层执行） -->
    <button
      class="theme-btn"
      :class="{ dark: theme.dark }"
      :aria-label="theme.dark ? '切换到浅色模式' : '切换到深色模式'"
      :title="theme.dark ? '切换到浅色模式' : '切换到深色模式'"
      @click="emit('toggleTheme', $event.currentTarget as HTMLElement)"
    >
      <span
        class="theme-icon"
        :class="theme.dark ? 'i-mingcute-sun-line' : 'i-mingcute-moon-line'"
      ></span>
    </button>
  </header>
</template>

<style scoped>
.app-header {
  position: relative;
  z-index: 300; /* 位于主题波纹遮罩之上，切换动画期间按钮保持可见 */
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 22px;
  background: rgba(240, 247, 255, 0.8);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: auto;
}
.logo-mark {
  font-size: 26px;
  color: var(--accent);
}
.logo-text {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-h);
  letter-spacing: -0.4px;
}
.logo-tag {
  font-size: 12px;
  color: var(--accent-2);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: #fff;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: var(--text-h);
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.icon-btn:hover {
  background: var(--accent-bg);
  box-shadow: var(--shadow);
}
.icon-btn:active {
  transform: scale(0.92);
}

/* 主题切换按钮 */
.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: var(--text-h);
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease,
    color 0.3s ease;
}
.theme-btn:hover {
  background: var(--accent-bg);
  box-shadow: var(--shadow);
}
.theme-btn:active {
  transform: scale(0.92);
}
.theme-btn.dark {
  background: #1a2633;
  color: #ffd76a;
  border-color: rgba(120, 165, 210, 0.3);
}
.theme-icon {
  font-size: 20px;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.theme-btn.dark .theme-icon {
  transform: rotate(180deg);
}
</style>
