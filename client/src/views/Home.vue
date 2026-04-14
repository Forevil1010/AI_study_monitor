<template>
  <div class="home">
    <div class="header">
      <h2>AI专注自习室</h2>
      <div class="header-actions">
        <el-button @click="$router.push('/history')">历史记录</el-button>
        <el-button type="info" @click="logout">退出登录</el-button>
      </div>
    </div>

    <div class="layout">
      <!-- 摄像头容器：固定宽高+黑色背景，避免空白 -->
      <div class="camera-container">
        <canvas ref="canvasRef" width="640" height="480" class="camera-canvas"></canvas>
        <!-- 权限提示遮罩 -->
        <div v-if="cameraError" class="camera-tip">
          <p>⚠️ 请允许摄像头权限，并检查设备</p>
        </div>
      </div>

      <div class="panel">
        <div class="item">
          <h3>当前状态</h3>
          <p :class="status === '分心' ? 'distract' : 'focus'">
            {{ status }}
          </p>
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
          :disabled="isStudying || cameraError"
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const canvasRef = ref(null)
const status = ref('准备中')
const reason = ref('')
const distractCount = ref(0)
const mirror = ref(false)
const isStudying = ref(false)
const timer = ref(0)
const currentSessionId = ref(null)
const cameraError = ref(false) // 摄像头错误状态
let video = null
let animationId = null
let timerInterval = null
let detectInterval = null
let prevDistracted = false

// 格式化时间
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

// 渲染摄像头画面（修复空指针+渲染逻辑）
const renderCamera = () => {
  if (!canvasRef.value || !video) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (mirror.value) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
  
  animationId = requestAnimationFrame(renderCamera);
}

// 打开摄像头（修复权限超时+错误处理）
const startCamera = async () => {
  try {
    cameraError.value = false;
    await nextTick();
    
    if (!canvasRef.value) {
      throw new Error('摄像头容器未渲染');
    }

    // 申请摄像头权限，增加超时处理
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      } 
    });
    
    video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true'); // 适配移动端/浏览器
    video.play();
    
    video.onloadedmetadata = () => {
      status.value = '已就绪';
      renderCamera();
    };

    // 视频播放错误处理
    video.onerror = (err) => {
      console.error('视频播放错误:', err);
      cameraError.value = true;
      ElMessage.error('摄像头播放失败，请检查设备');
    };

  } catch (err) {
    console.error('摄像头启动失败:', err);
    cameraError.value = true;
    status.value = '摄像头异常';
    ElMessage.error('请允许摄像头权限，并检查设备');
  }
}

const DISTRACT_LABELS = new Set(['刷手机', '东张西望', '低头/睡觉', '交谈'])

// 页面挂载时启动摄像头
onMounted(() => {
  startCamera();
});

// 开始专注
const startStudy = async () => {
  if (cameraError.value) {
    ElMessage.error('摄像头异常，无法开始专注');
    return;
  }

  try {
    const res = await axios.post('/api/session/start');
    currentSessionId.value = res.data.sessionId;
    isStudying.value = true;
    status.value = '专注中';
    reason.value = '';
    distractCount.value = 0;
    prevDistracted = false;
    ElMessage.success('已开始专注');

    // 启动计时器
    timerInterval = setInterval(() => {
      timer.value++;
    }, 1000);

    // 后端 Python mediapipe 检测（每 2 秒上传当前画布）
    detectInterval = setInterval(async () => {
      const canvas = canvasRef.value;
      if (!canvas) return;
      try {
        const image = canvas.toDataURL('image/jpeg', 0.8)
        const detectRes = await axios.post('/api/detect', { image })
        const result = detectRes.data || {}
        const label = result.label || ''
        const msg = result.reason || label || '检测到分心'
        const isDistracted = result.isDistracted ?? DISTRACT_LABELS.has(label)

        if (isDistracted) {
          status.value = '分心';
          reason.value = msg;
          if (!prevDistracted) {
            distractCount.value++;
            ElMessage({
              type: 'error',
              message: `⚠️ 分心提醒：${msg}`,
              duration: 2500,
              offset: 50
            });
          }
          prevDistracted = true;
        } else {
          status.value = '专注中';
          reason.value = '';
          prevDistracted = false;
        }
      } catch (err) {
        console.error('检测失败:', err);
      }
    }, 2000);
  } catch (err) {
    console.error('开始失败:', err);
    const isNetwork =
      err.code === 'ERR_NETWORK' ||
      err.message === 'Network Error' ||
      !err.response;
    if (isNetwork) {
      ElMessage.error(
        '无法连接服务端：请先在 server 目录执行 npm start，并确认 MySQL 已启动（库名 ai_study_monitor）'
      );
    } else if (err.response?.status === 401) {
      ElMessage.error(err.response?.data?.msg || '登录已过期，请重新登录');
    } else {
      const d = err.response?.data;
      ElMessage.error(
        d?.msg || d?.error || '开始失败，请检查后端与数据库'
      );
    }
  }
}

// 结束专注
const endStudy = async () => {
  try {
    await axios.post('/api/session/end', {
      sessionId: currentSessionId.value,
      distractionCount: distractCount.value
    });

    isStudying.value = false;
    status.value = '已就绪';
    ElMessage.info(`专注结束！时长：${formatTime(timer.value)}，分心：${distractCount.value}`);

    // 清除定时器
    clearInterval(timerInterval);
    clearInterval(detectInterval);
    timer.value = 0;
    reason.value = '';
    currentSessionId.value = null;
  } catch (err) {
    ElMessage.error('结束失败');
    console.error(err);
  }
}

// 退出登录
const logout = () => {
  // 清除所有资源
  clearInterval(timerInterval);
  clearInterval(detectInterval);
  if (animationId) cancelAnimationFrame(animationId);
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  
  localStorage.removeItem('token');
  ElMessage.success('退出登录成功');
  router.push('/login');
}

// 页面卸载时清理资源
onUnmounted(() => {
  clearInterval(timerInterval);
  clearInterval(detectInterval);
  if (animationId) cancelAnimationFrame(animationId);
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
});
</script>

<style scoped>
.home { padding: 20px; }
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.layout {
  display: flex;
  gap: 30px;
  margin-top: 20px;
  align-items: flex-start;
}
/* 摄像头容器样式：固定宽高+黑色背景 */
.camera-container {
  width: 640px;
  height: 480px;
  border: 2px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  position: relative;
}
.camera-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
/* 摄像头提示遮罩 */
.camera-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 16px;
  text-align: center;
  background: rgba(0,0,0,0.7);
  padding: 10px 20px;
  border-radius: 8px;
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
  color: #f5444b;
  font-weight: 500;
  margin-top: 6px;
}
.mirror-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>