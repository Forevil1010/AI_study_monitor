<template>
  <div class="register">
    <div class="register-card">
      <h2>账号注册</h2>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>

        <!-- 密码 -->
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
          />
        </el-form-item>

        <!-- 重复密码（我帮你加上了） -->
        <el-form-item label="重复密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleRegister" block>
            注册
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="text" @click="$router.push('/login')">
            已有账号？去登录
          </el-button>
        </el-form-item>
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
  await register(form.value) // 直接传给后端
  ElMessage.success('注册成功')
  router.push('/login')
}
</script>

<style scoped>
.register {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}
.register-card {
  width: 400px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}
.register-card h2 {
  text-align: center;
  margin-bottom: 24px;
}
</style>