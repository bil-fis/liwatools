import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'uno.css'
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(createPinia()).use(router).mount('#app')

// 应用成功启动，移除“浏览器过于老旧”提示层（无论是否显示过）
document.getElementById('too-old')?.remove()
