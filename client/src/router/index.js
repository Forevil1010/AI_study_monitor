import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Register from '../views/Register.vue'
import History from '../views/History.vue'
import { getToken } from '../utils/authStorage'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/home', component: Home },
  { path: '/history', component: History },
  { path: '/register', component: Register }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const token = getToken()
  if ((to.path === '/home' || to.path === '/history') && !token) {
    return '/login'
  }
  return true
})

export default router