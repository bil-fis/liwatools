import type { Component } from 'vue'

export interface ToolDef {
  /** 唯一标识，同时作为 store 中保留数据的 key */
  id: string
  /** 侧栏显示名称 */
  name: string
  /** mingcute 图标名（不含 i-mingcute- 前缀） */
  icon: string
  /** 组件 */
  component: Component
  /** 简短描述，显示在内容区标题下方 */
  desc: string
  /** 所属分类 id */
  category: string
}

export interface CategoryDef {
  /** 分类唯一 id */
  id: string
  /** 分类显示名称，如「文件转换类」 */
  name: string
  /** mingcute 图标名（不含 i-mingcute- 前缀） */
  icon: string
}
