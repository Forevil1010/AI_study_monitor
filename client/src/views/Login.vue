<template>
  <div class="login-container">
    <h1>AI自习室防分心助手 - 登录</h1>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
// 引入我们封装好的接口
import { login, startSession, endSession } from '../api/index.js'

// 页面一加载就自动测试后端接口
onMounted(async () => {
  try {
    // 1. 测试登录
    const loginRes = await login({ username: 'test', password: '123456' })
    console.log('✅ 登录成功：', loginRes.data)

    // 2. 测试开始专注
    const startRes = await startSession()
    console.log('✅ 开始专注成功：', startRes.data)

    // 3. 测试结束专注
    const endRes = await endSession()
    console.log('✅ 结束专注成功：', endRes.data)
  } catch (err) {
    console.error('❌ 接口调用失败：', err)
  }
})
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>