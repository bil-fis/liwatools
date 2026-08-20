<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 编译期收集本地背景图（assets/images/bg 下任意图片）
const localImages = Object.values(
  import.meta.glob('../assets/images/bg/**', { eager: true, import: 'default' }) as Record<
    string,
    string
  >,
)

const bgUrl = ref<string>('')

function pickLocal(): string {
  if (localImages.length === 0) return ''
  const i = Math.floor(Math.random() * localImages.length)
  return localImages[i]
}

onMounted(() => {
  bgUrl.value = pickLocal()
})
</script>

<template>
  <div
    class="bg-layer"
    :style="bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined"
  ></div>
</template>

<style scoped>
.bg-layer {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--bg);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
/* 白色蒙版，保证前景可读性 */
.bg-layer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.4);
}
</style>
