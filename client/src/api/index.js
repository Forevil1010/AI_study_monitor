import axios from 'axios'

// 创建axios实例，统一配置后端地址
const request = axios.create({
  baseURL: 'http://localhost:3000/api', // 后端服务地址
  timeout: 5000 // 请求超时时间
})

// 封装接口方法
export const login = (data) => request.post('/login', data)
export const startSession = () => request.post('/session/start')
export const endSession = () => request.post('/session/end')
export const register = (data) => request.post('/register', data)

export default request