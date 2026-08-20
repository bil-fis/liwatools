<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { tools } from '../tools/registry'

const route = useRoute()

/** 优先取路径参数 /json/，其次取查询参数 ?tool=json，最后回退到第一个工具 */
const toolId = computed(() => {
  const p = route.params.tool
  if (typeof p === 'string' && p) return p
  const q = route.query.tool
  if (typeof q === 'string' && q) return q
  return tools[0].id
})

const current = computed(() => tools.find((t) => t.id === toolId.value) ?? tools[0])
const ActiveComp = computed(() => current.value.component)
</script>

<template>
  <main class="content">
    <header class="content-head">
      <h1>
        <span :class="`i-mingcute-${current.icon}`" class="head-icon"></span>
        {{ current.name }}
      </h1>
      <p class="desc">{{ current.desc }}</p>
    </header>
    <section class="content-body">
      <component :is="ActiveComp" />
    </section>
  </main>
</template>

<style scoped>
.content {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(6px) saturate(160%);
  -webkit-backdrop-filter: blur(6px) saturate(160%);
}
/* 头部固定，不随内容滚动 */
.content-head {
  flex-shrink: 0;
  padding: 40px 48px 18px;
}
.content-head h1 {
  font-size: 32px;
  margin: 0;
  letter-spacing: -0.6px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.head-icon {
  font-size: 30px;
  color: var(--pink);
}
.desc {
  color: var(--text);
  font-size: 14px;
  opacity: 0.8;
  margin-top: 4px;
}
/* 唯一的页面级滚动容器：主体区域有界滚动 */
.content-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 48px 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

@media (max-width: 768px) {
  .content-head { padding: 24px 18px 14px; }
  .content-body { padding: 4px 18px 28px; }
  .content-head h1 {
    font-size: 26px;
  }
}
</style>
