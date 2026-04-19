import axios from 'axios'
import { getToken } from '../utils/authStorage'

const apiBase =
  import.meta.env.DEV
    ? '/api'
    : `${(import.meta.env.VITE_API_BASE || 'http://localhost:3000').replace(/\/$/, '')}/api`

const request = axios.create({
  baseURL: apiBase,
  timeout: 5000
})

// 自动加 token 拦截器（与 sessionStorage 一致）
request.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => Promise.reject(error))

// 接口封装
export const login = (data) => request.post('/login', data)
export const startSession = () => request.post('/session/start')
export const endSession = (data) => request.post('/session/end', data)
export const register = (data) => request.post('/register', data)
export const detectDistraction = (data) => request.post('/detect', data)
export const getSessionHistory = () => request.get('/session/history')

export default request