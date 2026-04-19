<template>
  <div class="history-page">
    <header class="toolbar">
      <div class="toolbar-left">
        <el-button round @click="$router.push('/home')">
          ← 返回自习
        </el-button>
        <div>
          <h1>专注历史</h1>
          <p class="toolbar-hint">已结束的自习会话会显示在下方</p>
        </div>
      </div>
    </header>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-alert v-else-if="errorMsg" type="error" :title="errorMsg" show-icon :closable="false" class="alert-block" />
    <el-empty v-else-if="list.length === 0" description="暂无记录，结束一次专注后会出现在这里" />
    <div v-else class="list">
      <article v-for="item in list" :key="item.id" class="item">
        <div class="item-head">
          <span class="badge">#{{ item.id }}</span>
          <span class="session-name">{{ item.session_name || '自习会话' }}</span>
        </div>
        <dl class="meta">
          <div><dt>开始</dt><dd>{{ formatDateTime(item.start_time) }}</dd></div>
          <div><dt>结束</dt><dd>{{ formatDateTime(item.end_time) }}</dd></div>
          <div><dt>时长</dt><dd>{{ formatDuration(item.duration) }}</dd></div>
          <div><dt>专注率</dt><dd>{{ formatRate(item.focus_rate) }}</dd></div>
          <div><dt>分心次数</dt><dd>{{ item.distraction_count ?? 0 }}</dd></div>
        </dl>
      </article>
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
  min-height: 100vh;
  padding: 24px 28px 40px;
  max-width: 760px;
  margin: 0 auto;
  background: linear-gradient(165deg, #f8fafc 0%, #eef2ff 50%, #f1f5f9 100%);
}
.toolbar {
  margin-bottom: 24px;
}
.toolbar-left {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  flex-wrap: wrap;
  padding: 18px 20px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}
.toolbar h1 {
  margin: 0 0 4px;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.toolbar-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}
.alert-block {
  border-radius: 12px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.item {
  border: 1px solid #e2e8f0;
  padding: 18px 20px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.item-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6366f1;
  background: #eef2ff;
  padding: 4px 10px;
  border-radius: 6px;
}
.session-name {
  font-weight: 600;
  color: #0f172a;
}
.meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px 16px;
  margin: 0;
}
.meta dt {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
  margin: 0 0 2px;
}
.meta dd {
  margin: 0;
  font-size: 0.9rem;
  color: #334155;
}
</style>
