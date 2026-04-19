import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import axios from 'axios'
import { getToken } from './utils/authStorage'

// 旧版曾用 localStorage 存 token，启动时清除以免仍显示为已登录
try {
  localStorage.removeItem('token')
} catch {
  /* ignore */
}

// 开发环境走 Vite 代理（同源 /api → 127.0.0.1:3000），避免直连失败；生产可设 VITE_API_BASE
const apiOrigin = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || 'http://localhost:3000'
axios.defaults.baseURL = import.meta.env.DEV ? '' : apiOrigin
// 自动给请求加 Token（sessionStorage，关闭浏览器后需重新登录）
axios.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.mount('#app')