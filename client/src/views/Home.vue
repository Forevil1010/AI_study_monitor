<template>
  <div class="home">
    <div class="header">
      <h2>AI专注自习室</h2>
      <!-- 退出登录按钮 -->
      <el-button type="info" @click="logout">退出登录</el-button>
    </div>

    <div class="layout">
      <!-- 摄像头区域 -->
      <div class="camera">
        <video
          ref="videoRef"
          autoplay
          playsinline
          width="640"
          height="480"
          :style="{ transform: mirror ? 'scaleX(-1)' : 'scaleX(1)' }"
        ></video>
      </div>

      <!-- 状态面板 -->
      <div class="panel">
        <div class="item">
          <h3>当前状态</h3>
          <p :class="status === '分心' ? 'distract' : 'focus'">
            {{ status }}
          </p>
        </div>

        <div class="item">
          <h3>分心次数</h3>
          <p>{{ count }}</p>
        </div>

        <!-- 镜像开关 -->
        <div class="mirror-switch">
          <span>摄像头镜像：</span>
          <el-switch v-model="mirror" />
        </div>

        <el-button type="primary" size="large" @click="startStudy">
          开始专注
        </el-button>
        <el-button type="danger" size="large" @click="endStudy">
          结束专注
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { startSession, endSession } from '../api'

const router = useRouter()
const videoRef = ref(null)
const status = ref('正常')
const count = ref(0)
const mirror = ref(false)

// 打开摄像头
onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.value.srcObject = stream
  } catch (err) {
    ElMessage.error('请允许摄像头权限')
  }
})

// 开始学习
const startStudy = async () => {
  await startSession()
  status.value = '专注学习中'
  ElMessage.success('已开始专注')
}

// 结束学习
const endStudy = async () => {
  await endSession()
  status.value = '已结束'
  ElMessage.info('已结束专注')
}

// 退出登录
const logout = () => {
  ElMessage.success('退出登录成功')
  router.push('/login')
}
</script>

<style scoped>
.home {
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.layout {
  display: flex;
  gap: 30px;
  margin-top: 20px;
}
.camera {
  border: 2px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}
.panel {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.item {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}
.focus {
  color: green;
  font-weight: bold;
}
.distract {
  color: red;
  font-weight: bold;
}
.mirror-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}
</style>