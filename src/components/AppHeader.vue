<script setup lang="ts">
defineProps<{
  /** 是否移动端布局 */
  isMobile: boolean
}>()
const emit = defineEmits<{ toggleMobile: [] }>()
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
  </header>
</template>

<style scoped>
.app-header {
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
</style>
