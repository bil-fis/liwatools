<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {categories, tools} from '../tools/registry'

const copyrightYear = computed(() => {
  const now = new Date().getFullYear()
  if (now !== 2026) {
    return `2026-${now}`
  } else {
    return '2026'
  }
})

defineProps<{
  /** 桌面端折叠（仅图标），移动端为抽屉开关 */
  collapsed: boolean
  /** 移动端抽屉是否打开 */
  mobileOpen: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const router = useRouter()

/** 当前选中的工具 id（路径参数或查询参数） */
const curId = computed(() => {
  const p = route.params.tool
  if (typeof p === 'string' && p) return p
  const q = route.query.tool
  if (typeof q === 'string' && q) return q
  return tools[0].id
})

const STORAGE_KEY = 'liwatools.sidebar.expanded'
const query = ref('')

/** 从 localStorage 读取展开状态，缺省全部展开 */
function loadExpanded(): Record<string, boolean> {
  const init: Record<string, boolean> = {}
  for (const c of categories) init[c.id] = true
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (saved && typeof saved === 'object') {
      for (const c of categories) if (typeof saved[c.id] === 'boolean') init[c.id] = saved[c.id]
    }
  } catch {
    /* 忽略损坏数据，使用默认全展开 */
  }
  return init
}

const expanded = reactive(loadExpanded())

watch(
    expanded,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {
        /* 隐私模式等无法写入时静默忽略 */
      }
    },
    {deep: true},
)

/** 过滤后每个分类的工具列表 */
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return null // null 表示全量
  return categories.map((c) => ({
    cat: c,
    items: tools.filter((t) => t.category === c.id && t.name.toLowerCase().includes(q)),
  }))
})

function visibleCats() {
  if (!filtered.value) return categories
  return filtered.value.filter((g) => g.items.length > 0).map((g) => g.cat)
}

function itemsOf(catId: string) {
  const all = tools.filter((t) => t.category === catId)
  const f = filtered.value?.find((g) => g.cat.id === catId)
  return f ? f.items : all
}

const hasResult = computed(() => {
  if (!filtered.value) return true
  return filtered.value.some((g) => g.items.length > 0)
})

function toggle(catId: string) {
  expanded[catId] = !expanded[catId]
}

function select(id: string) {
  router.push({ path: `/${id}/` }) // 末尾斜杠风格：/json/
  emit('close') // 移动端选中后收起抽屉
}
</script>

<template>
  <!-- 移动端遮罩 -->
  <div v-if="mobileOpen" class="scrim" @click="emit('close')"></div>

  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <div v-if="!collapsed" class="search-wrap">
      <span class="i-mingcute-search-line search-icon"></span>
      <input
          v-model="query"
          class="search"
          type="text"
          placeholder="搜索工具…"
      />
      <button
          v-if="query"
          class="search-clear"
          aria-label="清除"
          @click="query = ''"
      >
        <span class="i-mingcute-close-line"></span>
      </button>
    </div>

    <nav class="nav">
      <template v-for="cat in visibleCats()" :key="cat.id">
        <!-- 分类标题 -->
        <button class="cat-head" :class="{ compact: collapsed }" @click="toggle(cat.id)">
          <span :class="`i-mingcute-${cat.icon}`" class="cat-icon"></span>
          <span v-if="!collapsed" class="cat-name">{{ cat.name }}</span>
          <span
              v-if="!collapsed"
              :class="expanded[cat.id] ? 'i-mingcute-up-line' : 'i-mingcute-down-line'"
              class="cat-arrow"
          ></span>
        </button>

        <!-- 分类下的工具 -->
        <div v-if="expanded[cat.id]" class="cat-items" :class="{ compact: collapsed }">
          <button
              v-for="t in itemsOf(cat.id)"
              :key="t.id"
              class="nav-item"
              :class="{ active: curId === t.id, 'compact-item': collapsed }"
              :title="t.name"
              @click="select(t.id)"
          >
            <span :class="`i-mingcute-${t.icon}`" class="nav-icon"></span>
            <span v-if="!collapsed" class="nav-label">{{ t.name }}</span>
          </button>
        </div>
      </template>

      <p v-if="!hasResult" class="no-res">
        <span class="i-mingcute-search-line"></span> 无匹配工具
      </p>
    </nav>

    <div v-if="!collapsed" class="sidebar-foot">
      &copy; {{ copyrightYear }} 林晚晚ss.
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
  z-index: 20;
  width: 252px;
  flex-shrink: 0;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(240, 247, 255, 0.78);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid var(--border);
  user-select: none;
  -webkit-user-select: none;
  transition: width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 桌面端折叠：仅图标 */
.sidebar.collapsed {
  width: 72px;
}

/* 桌面端：从主页进入工具页时，侧边栏从左滑入 */
@media (min-width: 769px) {
  .sidebar {
    animation: sidebarIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}
@keyframes sidebarIn {
  from {
    transform: translateX(-100%);
    opacity: 0.3;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  overscroll-behavior: contain;
}

/* 搜索框 */
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 16px;
  color: var(--text);
  opacity: 0.55;
  pointer-events: none;
}

.search {
  width: 100%;
  padding: 10px 34px 10px 36px;
  border: 1.5px solid var(--border);
  border-radius: 14px;
  background: #fff;
  font: inherit;
  font-size: 14px;
  color: var(--text-h);
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.search:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-bg);
}

.search-clear {
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text);
  opacity: 0.6;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.15s ease, transform 0.15s ease;
}

.search-clear:hover {
  background: var(--accent-bg);
}

.search-clear:active {
  transform: scale(0.9);
}

.no-res {
  text-align: center;
  padding: 18px 0;
  color: var(--text);
  opacity: 0.6;
  font-size: 13px;
}

.no-res span {
  margin-right: 6px;
}

/* 分类标题 */
.cat-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 10px;
  padding: 8px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--accent-2);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}

.cat-head:first-child {
  margin-top: 0;
}

.cat-head:hover {
  background: var(--accent-bg);
}

.cat-head.compact {
  justify-content: center;
  padding: 8px 0;
  margin-top: 12px;
}

.cat-icon {
  font-size: 17px;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cat-head:hover .cat-icon {
  transform: scale(1.12) rotate(-6deg);
}

.cat-name {
  margin-right: auto;
  white-space: nowrap;
  color: var(--pink);
}

.cat-arrow {
  font-size: 13px;
  opacity: 0.7;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 分类下的工具 */
.cat-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 12px;
  margin-top: 2px;
  border-left: 1.5px dashed var(--border);
  margin-left: 14px;
  animation: catIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes catIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.22s cubic-bezier(0.34, 1.2, 0.4, 1),
  background 0.18s ease, color 0.18s ease, box-shadow 0.22s ease;
}

.nav-item:hover {
  background: var(--pink-bg);
  transform: translateX(3px);
}

.nav-item:active {
  transform: scale(0.96);
}

.nav-item.active {
  background: var(--pink);
  color: #fff;
  box-shadow: 0 8px 18px -6px var(--pink);
}

/* 折叠态：工具仅图标，且不再缩进 */
.nav-item.compact-item {
  justify-content: center;
  padding: 10px 0;
  margin: 0;
}

.cat-items.compact {
  border-left: none;
  margin-left: 0;
  padding-left: 0;
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  font-weight: 600;
  white-space: nowrap;
}

.sidebar-foot {
  margin-top: auto;
  text-align: center;
  font-size: 12px;
  color: var(--text);
  opacity: 0.7;
  white-space: nowrap;
}

.sidebar-foot span {
  margin-right: 4px;
  color: var(--pink);
}

/* 移动端遮罩 */
.scrim {
  display: none;
}

/* ===== 移动端：侧栏变抽屉，默认隐藏，从左侧滑出 ===== */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 240px;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-right: 1px solid var(--border);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: var(--shadow);
  }

  /* 移动端忽略 collapsed，始终展开 */
  .sidebar.collapsed {
    width: 240px;
  }

  .cat-head.compact {
    justify-content: flex-start;
    padding: 8px 12px;
  }

  .nav-item.compact-item {
    justify-content: flex-start;
    padding: 10px 14px;
  }

  .cat-items.compact {
    border-left: 1.5px dashed var(--border);
    margin-left: 14px;
    padding-left: 12px;
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 15;
    background: rgba(60, 47, 71, 0.28);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
}
</style>
