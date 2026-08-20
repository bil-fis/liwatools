<script setup lang="ts">
</script>

<template>
  <div class="placeholder">
    <span class="i-mingcute-file-line big"></span>
    <p>文档批量转换</p>
    <p class="hint">功能开发中：支持批量 Markdown / Word / PDF 互转与合并。</p>
  </div>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 90px 20px;
  text-align: center;
  color: var(--text-h);
}
.big {
  font-size: 64px;
  color: var(--accent);
}
.placeholder p {
  font-size: 18px;
  font-weight: 700;
}
.hint {
  font-size: 14px !important;
  font-weight: 500 !important;
  opacity: 0.75;
  max-width: 360px;
}
</style>
