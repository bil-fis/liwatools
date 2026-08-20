import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 工具数据以「工具 id -> 任意数据对象」的形式保留在内存中，
 * 切换工具时不会清空，回到上一个工具可继续编辑。
 * 当前选中的工具由路由（URL）决定，本 store 仅负责数据快照。
 */
export const useToolsStore = defineStore('tools', () => {
  /** 各工具的数据快照 */
  const data = ref<Record<string, any>>({})

  /** 读取某工具保留的数据（首次返回默认值） */
  function getData<T>(id: string, fallback: T): T {
    if (!(id in data.value)) data.value[id] = fallback
    return data.value[id] as T
  }

  /** 更新某工具保留的数据 */
  function setData<T>(id: string, value: T) {
    data.value[id] = value
  }

  return { data, getData, setData }
})
