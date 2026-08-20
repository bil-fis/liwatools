<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { categories, tools } from '../tools/registry'
import type { ToolDef } from '../tools/types'

const router = useRouter()

const activeTool = ref<ToolDef | null>(null)
const drawerOpen = ref(false)
const gridRef = ref<HTMLElement | null>(null)
const drawerRef = ref<HTMLElement | null>(null)
const scrimRef = ref<HTMLElement | null>(null)

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 按分类分组，用于分区展示卡片 */
const groups = computed(() =>
  categories
    .map((cat) => ({ cat, items: tools.filter((t) => t.category === cat.id) }))
    .filter((g) => g.items.length > 0),
)

function openTool(tool: ToolDef, el: HTMLElement) {
  if (drawerOpen.value) return
  drawerOpen.value = true
  activeTool.value = tool

  if (prefersReduced) {
    showDrawer()
    return
  }

  // 1) 卡片放大并向右侧“飞入”页面
  const rect = el.getBoundingClientRect()
  const targetX = window.innerWidth - rect.left + 160
  gsap
    .timeline()
    .to(el, {
      x: targetX,
      y: -36,
      scale: 1.16,
      opacity: 0,
      duration: 0.55,
      ease: 'power2.in',
    })
    // 2) 右侧侧边栏滑入
    .add(() => showDrawer())
    .set(el, { clearProps: 'transform,opacity' })
}

function showDrawer() {
  if (scrimRef.value) {
    gsap.fromTo(scrimRef.value, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' })
  }
  if (drawerRef.value) {
    gsap.fromTo(drawerRef.value, { x: '100%' }, { x: '0%', duration: 0.55, ease: 'power3.out' })
  }
}

function closeTool() {
  if (!drawerOpen.value) return
  const tl = gsap.timeline()
  if (drawerRef.value) tl.to(drawerRef.value, { x: '100%', duration: 0.4, ease: 'power2.in' })
  if (scrimRef.value) tl.to(scrimRef.value, { opacity: 0, duration: 0.3 }, '<')
  tl.call(() => {
    activeTool.value = null
    drawerOpen.value = false
  })
}

/** 在完整页面（带左侧导航）中打开当前工具 */
function openFullPage() {
  const t = activeTool.value
  if (!t) return
  closeTool()
  router.push(`/${t.id}/`)
}

// Esc 关闭抽屉
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeTool()
}
watch(drawerOpen, (open) => {
  if (open) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

onMounted(async () => {
  await nextTick()
  if (prefersReduced) return
  // 卡片入场动画
  const cards = gridRef.value?.querySelectorAll('.card')
  if (cards?.length) {
    gsap.from(cards, {
      y: 26,
      opacity: 0,
      stagger: 0.045,
      duration: 0.55,
      ease: 'power2.out',
      clearProps: 'all',
    })
  }
})
</script>

<template>
  <main class="home">
    <div ref="gridRef" class="home-inner">
      <!-- 介绍区域 -->
      <section class="intro">
        <span class="intro-icon i-mingcute-sparkles-line"></span>
        <h1>欢迎来到晚晚工具箱</h1>
        <p>
          这里汇聚了各种实用的小工具——JSON 格式化、时间戳转换、随机数生成、Markdown
          编辑……全部在浏览器本地完成，无需上传、即开即用。点击任意卡片即可开始。
        </p>
      </section>

      <!-- 卡片墙：按分类分区 -->
      <section v-for="g in groups" :key="g.cat.id" class="cat-group">
        <h2 class="cat-title">
          <span :class="`i-mingcute-${g.cat.icon}`"></span>
          {{ g.cat.name }}
        </h2>
        <div class="card-grid">
          <button
            v-for="t in g.items"
            :key="t.id"
            class="card"
            @click="openTool(t, $event.currentTarget as HTMLElement)"
          >
            <span :class="`i-mingcute-${t.icon}`" class="card-icon"></span>
            <span class="card-name">{{ t.name }}</span>
            <span class="card-desc">{{ t.desc }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- 右侧工具抽屉 -->
    <teleport to="body">
      <div v-if="drawerOpen" ref="scrimRef" class="scrim" @click="closeTool"></div>
      <aside v-if="activeTool" ref="drawerRef" class="drawer" :class="{ open: drawerOpen }">
        <header class="drawer-head">
          <span :class="`i-mingcute-${activeTool.icon}`" class="drawer-icon"></span>
          <div class="drawer-title">
            <h3>{{ activeTool.name }}</h3>
            <p>{{ activeTool.desc }}</p>
          </div>
          <button class="drawer-btn" title="在完整页面打开" @click="openFullPage">
            <span class="i-mingcute-expand-player-line"></span>
          </button>
          <button class="drawer-btn close" title="关闭" @click="closeTool">
            <span class="i-mingcute-close-line"></span>
          </button>
        </header>
        <div class="drawer-body">
          <component :is="activeTool.component" />
        </div>
      </aside>
    </teleport>
  </main>
</template>

<style scoped>
.home {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px) saturate(160%);
  -webkit-backdrop-filter: blur(10px) saturate(160%);
}
.home-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 44px 40px 60px;
}

/* ===== 介绍区域 ===== */
.intro {
  text-align: center;
  padding: 18px 16px 46px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 36px;
}
.intro-icon {
  display: inline-block;
  font-size: 40px;
  color: var(--pink);
  margin-bottom: 10px;
  animation: floatY 3.2s ease-in-out infinite;
}
@keyframes floatY {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
.intro h1 {
  margin: 0 0 10px;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.6px;
  background: linear-gradient(120deg, var(--accent) 20%, var(--pink) 80%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.intro p {
  max-width: 640px;
  margin: 0 auto;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text);
  opacity: 0.85;
}

/* ===== 分类与卡片墙 ===== */
.cat-group {
  margin-bottom: 38px;
}
.cat-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 800;
  color: var(--text-h);
  letter-spacing: -0.2px;
}
.cat-title span {
  font-size: 19px;
  color: var(--pink);
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 18px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 26px 12px;
  border: 1px solid transparent;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(30, 46, 62, 0.05), 0 1px 3px rgba(30, 46, 62, 0.03);
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.25s ease,
    border-color 0.25s ease;
  user-select: none;
  min-height: 150px;
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 14px 34px rgba(135, 206, 235, 0.25), 0 4px 10px rgba(30, 46, 62, 0.05);
  border-color: rgba(135, 206, 235, 0.5);
}
.card:active {
  transform: scale(0.96);
}
.card-icon {
  font-size: 32px;
  color: var(--accent);
  background: var(--accent-bg);
  width: 62px;
  height: 62px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease;
}
.card:hover .card-icon {
  background: var(--pink-bg);
  color: var(--pink);
  transform: scale(1.06) rotate(-4deg);
}
.card-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-h);
  text-align: center;
  letter-spacing: -0.2px;
}
.card-desc {
  font-size: 12px;
  color: var(--text);
  opacity: 0.75;
  text-align: center;
  line-height: 1.5;
}

/* ===== 右侧抽屉 ===== */
.scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(60, 47, 71, 0.28);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
}
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  width: min(680px, 96vw);
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: -14px 0 44px rgba(30, 46, 62, 0.16);
  transform: translateX(100%);
  will-change: transform;
}
.drawer-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-soft);
  flex-shrink: 0;
}
.drawer-icon {
  font-size: 26px;
  color: var(--pink);
  background: #fff;
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  flex-shrink: 0;
  box-shadow: var(--shadow);
}
.drawer-title {
  flex: 1;
  min-width: 0;
}
.drawer-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--text-h);
}
.drawer-title p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--text);
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.drawer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text-h);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease;
  flex-shrink: 0;
}
.drawer-btn:hover {
  background: var(--accent-bg);
  color: var(--accent);
}
.drawer-btn.close:hover {
  background: #ffeef2;
  color: var(--error);
}
.drawer-btn:active {
  transform: scale(0.92);
}
.drawer-btn span {
  font-size: 18px;
}
.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
}

@media (max-width: 768px) {
  .home-inner {
    padding: 26px 18px 44px;
  }
  .intro {
    padding: 8px 8px 32px;
    margin-bottom: 26px;
  }
  .intro h1 {
    font-size: 26px;
  }
  .intro p {
    font-size: 13.5px;
  }
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 14px;
  }
  .card {
    padding: 20px 8px;
    min-height: 128px;
  }
  .drawer {
    width: 100%;
  }
  .drawer-body {
    padding: 14px;
  }
}
</style>
