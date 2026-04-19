<template>
  <div class="register">
    <div class="register-bg" aria-hidden="true" />
    <div class="register-card">
      <div class="brand">
        <span class="brand-icon">◇</span>
        <div>
          <h1>创建账号</h1>
          <p class="subtitle">注册后即可使用 AI 专注自习室</p>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="reg-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" size="large" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item class="btn-wrap">
          <el-button type="primary" size="large" class="full-btn" :loading="submitting" @click="handleRegister">
            注册
          </el-button>
        </el-form-item>
        <p class="link" @click="$router.push('/login')">已有账号？去登录</p>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register } from '../api'

const router = useRouter()
const formRef = ref(null)
const submitting = ref(false)

// 增加 confirmPassword
const form = ref({
  username: '',
  password: '',
  confirmPassword: ''
})

// 增加重复密码校验规则
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请输入重复密码', trigger: 'blur' },
    // 前端校验两次密码一致
    ({ model }) => ({
      validator(rule, value, callback) {
        if (value !== model.password) {
          return callback(new Error('两次输入的密码不一致'))
        }
        callback()
      }
    })
  ]
}

const handleRegister = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    await register(form.value)
    ElMessage.success('注册成功')
    router.push('/login')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '注册失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.register {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: #0f1419;
}
.register-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.3), transparent),
    radial-gradient(ellipse 55% 40% at 0% 60%, rgba(56, 189, 248, 0.1), transparent);
  pointer-events: none;
}
.register-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 36px 32px 28px;
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
  margin-bottom: 22px;
}
.brand-icon {
  font-size: 24px;
  line-height: 1;
  color: #8b5cf6;
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
.reg-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #475569;
}
.btn-wrap {
  margin-bottom: 8px;
}
.full-btn {
  width: 100%;
  font-weight: 600;
}
.link {
  text-align: center;
  color: #6366f1;
  cursor: pointer;
  font-size: 0.9rem;
  margin: 0;
}
.link:hover {
  text-decoration: underline;
}
</style>