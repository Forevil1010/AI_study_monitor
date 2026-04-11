<template>
  <div class="home">
    <div class="header">
      <h2>AI专注自习室</h2>
      <el-button type="info" @click="logout">退出登录</el-button>
    </div>

    <div class="layout">
      <div class="camera">
        <canvas ref="canvasRef" width="640" height="480"></canvas>
      </div>

      <div class="panel">
        <div class="item">
          <h3>当前状态</h3>
          <p :class="status === '分心' ? 'distract' : 'focus'">
            {{ status }}
          </p>
          <!-- 分心原因 👇 -->
          <p class="reason" v-if="status === '分心'">原因：{{ reason }}</p>
        </div>

        <div class="item">
          <h3>分心次数</h3>
          <p>{{ distractCount }}</p>
        </div>

        <div class="item">
          <h3>专注时长</h3>
          <p>{{ formatTime(timer) }}</p>
        </div>

        <div class="mirror-switch">
          <span>摄像头镜像：</span>
          <el-switch v-model="mirror" />
        </div>

        <el-button 
          type="primary" size="large" @click="startStudy"
          :disabled="isStudying"
        >
          开始专注
        </el-button>
        <el-button 
          type="danger" size="large" @click="endStudy"
          :disabled="!isStudying"
        >
          结束专注
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { startSession, endSession, detectDistraction } from '../api'

const router = useRouter()
const canvasRef = ref(null)
const status = ref('准备中')
const reason = ref('') // 分心原因
const distractCount = ref(0)
const mirror = ref(false)
const isStudying = ref(false)
const timer = ref(0)
let video = null
let animationId = null
let timerInterval = null
let detectInterval = null

// 格式化时间
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

// 渲染摄像头
const renderCamera = () => {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  
  if (mirror.value) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  
  animationId = requestAnimationFrame(renderCamera)
}

// 打开摄像头
onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    video = document.createElement('video')
    video.srcObject = stream
    video.play()
    renderCamera()
    status.value = '已就绪'
  } catch (err) {
    ElMessage.error('请允许摄像头权限')
  }
})

// 开始专注
const startStudy = async () => {
  await startSession()
  isStudying.value = true
  status.value = '专注中'
  reason.value = ''
  ElMessage.success('已开始专注')

  // 计时
  timerInterval = setInterval(() => {
    timer.value++
  }, 1000)

  // 每2秒检测分心
  detectInterval = setInterval(async () => {
    const canvas = canvasRef.value
    const frame = canvas.toDataURL('image/jpeg', 0.8)
    try {
      const res = await detectDistraction({ frame })
      const { isDistracted, reason: msg } = res.data

      if (isDistracted) {
        status.value = '分心'
        reason.value = msg
        distractCount.value++
        
        // 更明显的弹窗 👇
        ElMessage({
          type: 'error',
          message: `⚠️ 分心提醒：${msg}`,
          duration: 2000,
          offset: 50,
          customClass: 'big-warning'
        })
      } else {
        status.value = '专注中'
        reason.value = ''
      }
    } catch (err) {
      console.error('检测失败', err)
    }
  }, 2000)
}

// 结束专注
const endStudy = async () => {
  await endSession()
  isStudying.value = false
  status.value = '已结束'
  ElMessage.info(`专注结束！时长：${formatTime(timer.value)}，分心：${distractCount.value}`)

  clearInterval(timerInterval)
  clearInterval(detectInterval)
  timer.value = 0
  reason.value = ''
}

// 退出登录
const logout = () => {
  clearInterval(timerInterval)
  clearInterval(detectInterval)
  ElMessage.success('退出登录成功')
  router.push('/login')
}

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (video?.srcObject) video.srcObject.getTracks().forEach(t => t.stop())
  clearInterval(timerInterval)
  clearInterval(detectInterval)
})
</script>

<style scoped>
.home { padding: 20px; }
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
  width: 640px;
  height: 480px;
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
  box-shadow: 0 0 10px rgba(0,0,0,0.05);
}
.focus {
  color: green;
  font-weight: bold;
  font-size: 18px;
}
.distract {
  color: red;
  font-weight: bold;
  font-size: 20px;
}
.reason {
  color: #f54444;
  font-weight: 500;
  margin-top: 6px;
}
.mirror-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>

<!-- 让弹窗更大更明显 -->
<style>
.big-warning {
  font-size: 16px !important;
  padding: 15px 20px !important;
}
</style>