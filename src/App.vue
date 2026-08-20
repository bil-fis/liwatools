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

// ===== 主题切换：波纹扩散（clip-path 圆形遮罩） =====
const overlayRef = ref<HTMLElement | null>(null)
const themeAnimating = ref(false)
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onToggleTheme(el: HTMLElement) {
  if (themeAnimating.value) return
  const overlay = overlayRef.value
  const targetDark = !themeStore.dark
  if (!overlay || prefersReducedMotion) {
    themeStore.setDark(targetDark)
    return
  }
  themeAnimating.value = true
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  // 遮罩铺上「旧主题」底色，然后从按钮中心回缩——
  // 主题在动画开始时立即切换，波纹经过之处即为新主题（波纹经过即变色）
  overlay.style.background = targetDark ? '#f0f8ff' : '#090d17'
  gsap.killTweensOf(overlay)
  gsap.set(overlay, { clipPath: `circle(150% at ${cx}px ${cy}px)` })
  themeStore.setDark(targetDark)
  gsap.to(overlay, {
    clipPath: `circle(0% at ${cx}px ${cy}px)`,
    duration: 0.75,
    ease: 'power2.inOut',
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

onMounted(() => {
  themeStore.apply() // 与 index.html 预置保持一致
  checkViewport()
  window.addEventListener('resize', checkViewport)
})
onUnmounted(() => window.removeEventListener('resize', checkViewport))
</script>

<template>
  <div class="app-shell">
    <BackgroundLayer />
    <!-- 主题切换波纹遮罩 -->
    <div ref="overlayRef" class="theme-overlay"></div>

    <AppHeader
      :is-mobile="isMobile && !isHome"
      @toggle-mobile="mobileOpen = !mobileOpen"
      @toggle-theme="onToggleTheme"
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
.body-row {
  flex: 1;
  min-height: 0;
  display: flex;
}
</style>
