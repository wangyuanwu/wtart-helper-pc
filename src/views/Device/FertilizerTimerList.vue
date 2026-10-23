<template>
  <div class="fertilizer-outlet-page">
    <header class="fertilizer-outlet-page__head">
      <button type="button" class="fertilizer-outlet-page__back" @click="onBack">
        ← 返回
      </button>
      <h1 class="fertilizer-outlet-page__title">定时列表</h1>
    </header>
    <div class="fertilizer-outlet-page__body">
      <p>施肥机定时列表功能开发中</p>
      <p v-if="deviceId" class="fertilizer-outlet-page__meta">设备 ID：{{ deviceId }}</p>
    </div>
  </div>
</template>

<script setup>
/**
 * 施肥机定时列表占位页（控制页时钟图标出口）
 * 业务逻辑后续对齐移动端 fertilizer_timer_list
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFarmStore } from '@/store/farm'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const deviceId = computed(
  () => route.query.id || farmStore.s_control_device?.id || ''
)

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/device')
}
</script>

<style scoped>
.fertilizer-outlet-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.fertilizer-outlet-page__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.fertilizer-outlet-page__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.fertilizer-outlet-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.fertilizer-outlet-page__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  font-size: 14px;
}

.fertilizer-outlet-page__meta {
  margin: 0;
  color: #c0c4cc;
  font-size: 12px;
}
</style>
