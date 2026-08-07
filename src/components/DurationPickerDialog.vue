<template>
  <el-dialog
    v-model="visible"
    title="设置时长"
    width="360px"
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="duration-picker">
      <div class="duration-picker__field">
        <span class="duration-picker__label">时</span>
        <el-input-number v-model="hours" :min="0" :max="99" controls-position="right" />
      </div>
      <div class="duration-picker__field">
        <span class="duration-picker__label">分</span>
        <el-input-number v-model="minutes" :min="0" :max="59" controls-position="right" />
      </div>
      <div class="duration-picker__field">
        <span class="duration-picker__label">秒</span>
        <el-input-number v-model="seconds" :min="0" :max="59" controls-position="right" />
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { second2Time, time2Second } from '@/utils/programTime'

const emit = defineEmits(['confirm'])

const visible = ref(false)
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
let callback = null

function open(durationSeconds, onConfirm) {
  const total = parseInt(durationSeconds, 10) || 0
  hours.value = Math.floor(total / 3600)
  minutes.value = Math.floor((total % 3600) / 60)
  seconds.value = total % 60
  callback = onConfirm
  visible.value = true
}

function onConfirm() {
  const total = hours.value * 3600 + minutes.value * 60 + seconds.value
  callback?.(total, second2Time(total))
  emit('confirm', total, second2Time(total))
  visible.value = false
}

defineExpose({ open })
</script>

<style scoped>
.duration-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.duration-picker__field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.duration-picker__label {
  width: 24px;
  font-size: 14px;
  color: #606266;
}

.duration-picker__field :deep(.el-input-number) {
  flex: 1;
}
</style>
