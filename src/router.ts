import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './components/HomeView.vue'
import ToolView from './components/ToolView.vue'

const router = createRouter({
  // history 模式：URL 形如 /（主页）、/json/（工具）或 /?tool=json
  // 真实静态文件（如 /favicon.png、/assets/*）由服务器直接返回，不会被 router 捕获
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    // strict: false 使 /json 与 /json/ 等价；同时兼容 ?tool=json 查询参数
    { path: '/:tool', name: 'tool', component: ToolView, strict: false },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
