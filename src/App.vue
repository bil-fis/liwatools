<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import gsap from 'gsap'
import Sidebar from './components/Sidebar.vue'
import ToolView from './components/ToolView.vue'
import HomeView from './components/HomeView.vue'
import AppHeader from './components/AppHeader.vue'
import BackgroundLayer from './components/BackgroundLayer.vue'
import { useThemeStore } from './stores/theme'

const route = useRoute()
const themeStore = useThemeStore()

/** 主页：保留顶栏、不显示侧边栏 */
const isHome = computed(() => route.name === 'home')

const MOBILE_BP = 768
const isMobile = ref(false)
const mobileOpen = ref(false) // 移动端抽屉

// ===== 主题切换：波纹扩散（clip-path 圆形遮罩，仿参考实现） =====
// 遮罩是「深色本身」：常驻于内容之下（z-index 0），背景恒为深色底色。
// 切深色 → 深色波纹从按钮中心向外扩散；切浅色 → 深色波纹回缩露出浅色。
// 主题在动画开始时立即切换（波纹经过即变色）。
const overlayRef = ref<HTMLElement | null>(null)
const themeAnimating = ref(false)
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function getBtnCenter() {
  const btn = document.querySelector<HTMLElement>('.theme-btn')
  if (!btn) return { cx: window.innerWidth / 2, cy: window.innerHeight / 2 }
  const rect = btn.getBoundingClientRect()
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
}

function setOverlayClip(cx: number, cy: number, radiusPercent: string) {
  const overlay = overlayRef.value
  if (!overlay) return
  overlay.style.clipPath = `circle(${radiusPercent} at ${cx}px ${cy}px)`
}

function onToggleTheme() {
  if (themeAnimating.value) return
  const overlay = overlayRef.value
  const targetDark = !themeStore.dark
  if (!overlay || prefersReducedMotion) {
    themeStore.setDark(targetDark)
    return
  }
  themeAnimating.value = true
  const { cx, cy } = getBtnCenter()
  const from = themeStore.dark ? '150%' : '0%'
  const to = targetDark ? '150%' : '0%'

  gsap.killTweensOf(overlay)
  setOverlayClip(cx, cy, from)
  // 波纹经过即变色：动画开始就切换主题
  themeStore.setDark(targetDark)
  gsap.to(overlay, {
    clipPath: `circle(${to} at ${cx}px ${cy}px)`,
    duration: 0.85,
    ease: 'power2.out',
    onComplete: () => {
      themeAnimating.value = false
    },
  })
}

function checkViewport() {
  const mobile = window.innerWidth <= MOBILE_BP
  if (mobile !== isMobile.value) {
    isMobile.value = mobile
    if (!mobile) mobileOpen.value = false
  }
}

// 窗口 resize 时按当前主题状态更新遮罩圆心与半径
let resizeTimer: number | undefined
function syncOverlay() {
  clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    const { cx, cy } = getBtnCenter()
    setOverlayClip(cx, cy, themeStore.dark ? '150%' : '0%')
  }, 100)
}

onMounted(() => {
  themeStore.apply() // 与 index.html 预置保持一致
  const { cx, cy } = getBtnCenter()
  setOverlayClip(cx, cy, themeStore.dark ? '150%' : '0%')
  checkViewport()
  window.addEventListener('resize', checkViewport)
  window.addEventListener('resize', syncOverlay)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkViewport)
  window.removeEventListener('resize', syncOverlay)
})
</script>

<template>
  <div class="app-shell">
    <BackgroundLayer />
    <!-- 主题切换波纹遮罩 -->
    <div ref="overlayRef" class="theme-overlay"></div>

    <AppHeader
      :is-mobile="isMobile && !isHome"
      @toggle-mobile="mobileOpen = !mobileOpen"
      @toggle-theme="onToggleTheme()"
    />

    <div class="body-row">
      <Sidebar
        v-if="!isHome"
        :collapsed="false"
        :mobile-open="mobileOpen"
        @close="mobileOpen = false"
      />
      <HomeView v-if="isHome" />
      <ToolView v-else />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100svh;
  width: 100%;
  background: transparent;
  box-shadow: var(--shadow);
  overflow: hidden;
}
/* 内容置于主题遮罩之上，波纹在下方透过半透明面板可见 */
.body-row {
  flex: 1;
  min-height: 0;
  display: flex;
  position: relative;
  z-index: 1;
}
</style>
