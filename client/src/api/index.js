import axios from 'axios'

// 创建axios实例，统一配置后端地址
const request = axios.create({
  baseURL: 'http://localhost:3000/api', // 后端服务地址
  timeout: 5000 // 请求超时时间
})

// ===================== 核心：自动加token（我帮你加好了）=====================
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})
// ==========================================================================

// 封装接口方法
export const login = (data) => request.post('/login', data)
export const startSession = () => request.post('/session/start')
export const endSession = (data) => request.post('/session/end', data) // 这里也改了，支持传数据
export const register = (data) => request.post('/register', data)
// 新增分心检测接口
export const detectDistraction = (data) => request.post('/detect', data)

export default request