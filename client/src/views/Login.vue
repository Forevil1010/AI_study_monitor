<template>
  <div class="login-page">
    <div class="login-bg" aria-hidden="true" />
    <div class="login-box">
      <div class="brand">
        <span class="brand-icon">◎</span>
        <div>
          <h1>AI 专注自习室</h1>
          <p class="subtitle">登录后开始你的专注时段</p>
        </div>
      </div>

      <form @submit.prevent="handleLogin">
        <el-input
          v-model="form.username"
          placeholder="用户名"
          size="large"
          clearable
          class="input-item"
        />
        <el-input
          v-model="form.password"
          placeholder="密码"
          type="password"
          size="large"
          show-password
          class="input-item"
        />

        <el-button
          type="primary"
          native-type="submit"
          size="large"
          class="submit-btn"
          :loading="submitting"
        >
          登录
        </el-button>

        <p class="link" @click="$router.push('/register')">还没有账号？去注册</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../api'
import { setToken } from '../utils/authStorage'

const router = useRouter()
const submitting = ref(false)
const form = ref({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!form.value.username.trim() || !form.value.password.trim()) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  submitting.value = true
  try {
    const res = await login(form.value)
    const token = res.data.token
    if (!token) {
      ElMessage.error('登录失败，未获取到 token')
      return
    }

    setToken(token)
    ElMessage.success('登录成功')
    router.push('/home')
  } catch (err) {
    ElMessage.error(err.response?.data?.msg || '登录失败，请检查账号密码')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: var(--app-bg, #0f1419);
}
.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.35), transparent),
    radial-gradient(ellipse 60% 40% at 100% 50%, rgba(56, 189, 248, 0.12), transparent),
    radial-gradient(ellipse 50% 30% at 0% 80%, rgba(167, 139, 250, 0.15), transparent);
  pointer-events: none;
}
.login-box {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 36px 32px 32px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow:
    0 4px 24px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
}
.brand {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 28px;
}
.brand-icon {
  font-size: 28px;
  line-height: 1;
  color: #6366f1;
}
.brand h1 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}
.subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
}
.input-item {
  width: 100%;
  margin-bottom: 16px;
}
.submit-btn {
  width: 100%;
  margin-top: 4px;
  margin-bottom: 16px;
  font-weight: 600;
}
.link {
  text-align: center;
  color: #6366f1;
  cursor: pointer;
  font-size: 0.9rem;
}
.link:hover {
  text-decoration: underline;
}
</style>