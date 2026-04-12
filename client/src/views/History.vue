<template>
  <div class="history-page">
    <div class="toolbar">
      <el-button @click="$router.push('/home')">返回自习</el-button>
      <h2>我的专注历史</h2>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-alert v-else-if="errorMsg" type="error" :title="errorMsg" show-icon :closable="false" />
    <el-empty v-else-if="list.length === 0" description="暂无已结束的专注记录（结束一次专注后会出现在这里）" />
    <div v-else class="list">
      <div v-for="item in list" :key="item.id" class="item">
        <p><strong>会话</strong> #{{ item.id }} · {{ item.session_name || '自习会话' }}</p>
        <p>开始：{{ formatDateTime(item.start_time) }}</p>
        <p>结束：{{ formatDateTime(item.end_time) }}</p>
        <p>时长：{{ formatDuration(item.duration) }}</p>
        <p>专注率：{{ formatRate(item.focus_rate) }}</p>
        <p>分心次数：{{ item.distraction_count ?? 0 }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSessionHistory } from '../api'

const list = ref([])
const loading = ref(true)
const errorMsg = ref('')

function formatDateTime(v) {
  if (v == null || v === '') return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN')
}

function formatDuration(sec) {
  const n = Number(sec)
  if (!Number.isFinite(n) || n < 0) return '-'
  const m = Math.floor(n / 60)
  const s = n % 60
  if (m === 0) return `${s} 秒`
  return `${m} 分 ${s} 秒`
}

function formatRate(rate) {
  const n = Number(rate)
  if (!Number.isFinite(n)) return `${rate ?? '-'}%`
  return `${n.toFixed(1)}%`
}

onMounted(async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await getSessionHistory()
    list.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    errorMsg.value = e.response?.data?.msg || '加载失败，请重新登录或稍后重试'
    list.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.history-page {
  padding: 20px;
  max-width: 720px;
  margin: 0 auto;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.toolbar h2 {
  margin: 0;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.item {
  border: 1px solid #ebeef5;
  padding: 16px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.item p {
  margin: 6px 0;
  font-size: 14px;
  color: #303133;
}
</style>
