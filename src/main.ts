import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'uno.css'
import './style.css'
import App from './App.vue'
import router from './router'

const GREETING_THE_DEVELOPERS_OR_WHO_OPEN_THE_CONSOLE=[
    'Ciallo～(∠・ω<)⌒★',
    '你打开控制台了对吧？',
    '总之，建议游玩 小小的身影，重叠的内心 （steam免费galgame）',
    '还有，S.Y.Q要永远做你自己呀'
].join('\n')

console.log(GREETING_THE_DEVELOPERS_OR_WHO_OPEN_THE_CONSOLE)
console.log('buildrevision',__BUILD_REVISION__,"date",__BUILD_TIME__)

createApp(App).use(createPinia()).use(router).mount('#app')

// 应用成功启动，移除“浏览器过于老旧”提示层（无论是否显示过）
document.getElementById('too-old')?.remove()
