import { createRouter, createWebHistory } from 'vue-router'
import ToolView from './components/ToolView.vue'
import { tools } from './tools/registry'

/** 默认工具（访问根路径 / 时重定向到它） */
const DEFAULT_TOOL = tools[0].id

const router = createRouter({
  // history 模式：URL 形如 /json/ 或 /?tool=json
  // 真实静态文件（如 /favicon.png、/assets/*）由服务器直接返回，不会被 router 捕获
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: () => ({ path: `/${DEFAULT_TOOL}/` }) },
    // strict: false 使 /json 与 /json/ 等价；同时兼容 ?tool=json 查询参数
    { path: '/:tool', name: 'tool', component: ToolView, strict: false },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
