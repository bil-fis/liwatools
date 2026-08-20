import { defineStore } from 'pinia'

const STORAGE_KEY = 'liwatools.theme'

function readSaved(): boolean | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark') return true
    if (v === 'light') return false
  } catch {
    /* 隐私模式等无法读写时忽略 */
  }
  return null
}

/**
 * 主题 store：深/浅色状态全局唯一，跨路由切换不丢失。
 * 与 index.html 中的内联脚本使用同一个存储 key，保证首屏无闪烁。
 */
export const useThemeStore = defineStore('theme', {
  state: () => ({
    dark:
      readSaved() ??
      (typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false),
  }),
  actions: {
    /** 把当前状态同步到 <html data-theme> 与 localStorage */
    apply() {
      if (typeof document === 'undefined') return
      document.documentElement.dataset.theme = this.dark ? 'dark' : 'light'
      try {
        localStorage.setItem(STORAGE_KEY, this.dark ? 'dark' : 'light')
      } catch {
        /* ignore */
      }
    },
    setDark(v: boolean) {
      this.dark = v
      this.apply()
    },
    toggle() {
      this.setDark(!this.dark)
    },
  },
})
