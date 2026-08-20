<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import ToolView from './components/ToolView.vue'
import HomeView from './components/HomeView.vue'
import AppHeader from './components/AppHeader.vue'
import BackgroundLayer from './components/BackgroundLayer.vue'

const route = useRoute()

/** 主页：保留顶栏、不显示侧边栏 */
const isHome = computed(() => route.name === 'home')

const MOBILE_BP = 768
const isMobile = ref(false)
const mobileOpen = ref(false) // 移动端抽屉

function checkViewport() {
  const mobile = window.innerWidth <= MOBILE_BP
  if (mobile !== isMobile.value) {
    isMobile.value = mobile
    if (!mobile) mobileOpen.value = false
  }
}

onMounted(() => {
  checkViewport()
  window.addEventListener('resize', checkViewport)
})
onUnmounted(() => window.removeEventListener('resize', checkViewport))
</script>

<template>
  <div class="app-shell">
    <BackgroundLayer />

    <AppHeader
      :is-mobile="isMobile && !isHome"
      @toggle-mobile="mobileOpen = !mobileOpen"
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
