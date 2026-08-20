<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import gsap from 'gsap'
import {categories, tools} from '../tools/registry'
import type {ToolDef} from '../tools/types'

const router = useRouter()
const gridRef = ref<HTMLElement | null>(null)

const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 按分类分组，用于分区展示卡片 */
const groups = computed(() =>
    categories
        .map((cat) => ({cat, items: tools.filter((t) => t.category === cat.id)}))
        .filter((g) => g.items.length > 0),
)

/** 点击卡片：放大并向右飞出，随后切换到对应工具页 */
function openTool(tool: ToolDef, el: HTMLElement) {
  if (prefersReduced) {
    router.push(`/${tool.id}/`)
    return
  }

  const rect = el.getBoundingClientRect()
  const targetX = window.innerWidth - rect.left + 140
  gsap
      .timeline()
      .to(el, {
        x: targetX,
        y: -48,
        scale: 1.22,
        rotate: 5,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      })
      .call(() => router.push(`/${tool.id}/`))
}

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
        <span class="intro-icon i-mingcute-star-fill"></span>
        <h1>欢迎来到晚晚工具箱</h1>
        <p>
          随便做的工具合集，解决了<del>找不到工具的问题（划掉）</del>
          <br>
          欢迎使用喵(。•̀ᴗ-)✧<span style="color: rgb(186 186 186 / 0.3);">关注塔菲谢谢喵</span>
        </p>
        <p>
          <span><span class="i-mingcute-bilibili-fill font-500" style="color: #00a1d6;"></span><a href="https://space.bilibili.com/586310538" target="_blank" class="text-gray-500 no-underline hover:no-underline hover:text-gray-700">林晚晚ss.</a></span>
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
  color: var(--accent);
  margin-bottom: 10px;
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
  background: linear-gradient(120deg, var(--accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding-bottom: 6px;
  line-height: 1.15;
  overflow: visible;
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
}
</style>
