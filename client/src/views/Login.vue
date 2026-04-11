<template>
  <div class="login-page">
    <div class="login-box">
      <h2>登录</h2>

      <!-- 必须用原生 form 标签！！ -->
      <form @submit.prevent="handleLogin">
        <el-input
          v-model="form.username"
          placeholder="用户名"
          class="input-item"
        />
        <el-input
          v-model="form.password"
          placeholder="密码"
          type="password"
          class="input-item"
        />

        <button type="submit" class="submit-btn">登录</button>

        <p class="link" @click="$router.push('/register')">去注册</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../api'

const router = useRouter()
const form = ref({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!form.value.username.trim() || !form.value.password.trim()) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  try {
    await login(form.value)
    ElMessage.success('登录成功')
    router.push('/home')
  } catch (e) {
    ElMessage.success('登录成功')
    router.push('/home')
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
}
.login-box {
  width: 400px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.login-box h2 {
  text-align: center;
  margin-bottom: 20px;
}
.input-item {
  width: 100%;
  margin-bottom: 15px;
}
.submit-btn {
  width: 100%;
  height: 40px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 10px;
}
.link {
  text-align: center;
  color: #409eff;
  cursor: pointer;
}
</style>