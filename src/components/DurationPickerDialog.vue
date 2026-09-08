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
        <el-input-number v-model="hours" :min="0" :max="maxHours" controls-position="right" />
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
const maxHours = ref(99)
let callback = null

function open(durationSeconds, onConfirm, options = {}) {
  const total = parseInt(durationSeconds, 10) || 0
  maxHours.value = Number(options?.maxHours) > 0 ? Number(options.maxHours) : 99
  hours.value = Math.min(Math.floor(total / 3600), maxHours.value)
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
  /*
   * 高度定义在非 .el- 选择器上，会走 pxtorem。
   * el-input-number 本身被 selectorBlackList 跳过，若直接写 40px 则不同分辨率下
   * 输入框高度不缩放，而图标/行高可能受根字号影响，右侧 ↓ 箭头易被 overflow 裁切。
   */
  --duration-input-h: 40px;
  --duration-control-h: calc(var(--duration-input-h) / 2);
  --duration-control-w: 32px;
  --duration-icon-size: 12px;
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
  width: 100%;
  height: var(--duration-input-h);
  line-height: var(--duration-input-h);
  box-sizing: border-box;
}

.duration-picker__field :deep(.el-input-number .el-input__wrapper) {
  height: var(--duration-input-h);
  min-height: var(--duration-input-h);
  box-sizing: border-box;
}

.duration-picker__field :deep(.el-input-number.is-controls-right .el-input-number__increase),
.duration-picker__field :deep(.el-input-number.is-controls-right .el-input-number__decrease) {
  width: var(--duration-control-w);
  height: var(--duration-control-h) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
}

.duration-picker__field :deep(.el-input-number.is-controls-right .el-input-number__increase) {
  top: 0;
  bottom: auto;
}

.duration-picker__field :deep(.el-input-number.is-controls-right .el-input-number__decrease) {
  top: auto;
  bottom: 0;
}

.duration-picker__field :deep(.el-input-number__increase .el-icon),
.duration-picker__field :deep(.el-input-number__decrease .el-icon) {
  font-size: var(--duration-icon-size);
}
</style>
