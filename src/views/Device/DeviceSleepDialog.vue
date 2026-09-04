<template>
  <el-dialog
    :model-value="modelValue"
    title="定时睡眠提示"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="device-sleep-dialog"
    @update:model-value="onVisibleChange"
  >
    <p class="device-sleep-dialog__tip">
      定时睡眠期间设备无法远程控制。根据设备下次使用时间，可设置睡眠的醒来时间(建议提前半天到一天)。
    </p>
    <div class="device-sleep-dialog__field">
      <div class="device-sleep-dialog__label">睡眠时间</div>
      <el-date-picker
        v-model="endTime"
        type="datetime"
        value-format="YYYY-MM-DD HH:mm:ss"
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="选择睡眠时间"
        style="width: 100%"
      />
    </div>
    <div class="device-sleep-dialog__field">
      <div class="device-sleep-dialog__label">醒来时间</div>
      <el-date-picker
        v-model="startTime"
        type="datetime"
        value-format="YYYY-MM-DD HH:mm:ss"
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="选择醒来时间"
        style="width: 100%"
      />
    </div>
    <template #footer>
      <el-button class="device-op-dialog-btn device-op-dialog-btn--cancel" @click="onVisibleChange(false)">
        取消
      </el-button>
      <el-button
        type="primary"
        class="device-op-dialog-btn device-op-dialog-btn--confirm"
        @click="onConfirm"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const endTime = ref('')
const startTime = ref('')

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function initTimes() {
  const now = new Date()
  endTime.value = formatDate(now)
  const wake = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  startTime.value = formatDate(wake)
}

function onVisibleChange(v) {
  emit('update:modelValue', v)
}

function onConfirm() {
  if (!endTime.value || !startTime.value) {
    ElMessage.warning('请选择睡眠/醒来时间')
    return
  }
  emit('confirm', { startTime: startTime.value, endTime: endTime.value })
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) initTimes()
  }
)
</script>

<style scoped>
.device-sleep-dialog__tip {
  margin: 0 0 16px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.device-sleep-dialog__field {
  margin-bottom: 14px;
}

.device-sleep-dialog__label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}
</style>

<style>
.device-sleep-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.device-sleep-dialog .el-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.device-op-dialog-btn.el-button {
  min-width: 88px;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  font-weight: 600;
}

.device-op-dialog-btn--cancel.el-button {
  background: #fff;
  border: 1px solid #d8dee8;
  color: #303133;
}

.device-op-dialog-btn--cancel.el-button:hover {
  background: #f7fafc;
  border-color: #c0c4cc;
  color: #303133;
}

.device-op-dialog-btn--confirm.el-button,
.device-op-dialog-btn--confirm.el-button--primary {
  background: #274082;
  border-color: #274082;
  color: #fff;
}

.device-op-dialog-btn--confirm.el-button:hover,
.device-op-dialog-btn--confirm.el-button--primary:hover {
  background: #1f3468;
  border-color: #1f3468;
  color: #fff;
}

.device-op-message-box.el-message-box {
  border-radius: 16px;
  overflow: hidden;
  padding-bottom: 20px;
}

.device-op-message-box .el-message-box__btns {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.device-op-message-box .device-op-dialog-btn.el-button {
  min-width: 88px;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  font-weight: 600;
  margin-left: 0;
}

.device-op-message-box .device-op-dialog-btn--cancel.el-button {
  background: #fff;
  border: 1px solid #d8dee8;
  color: #303133;
}

.device-op-message-box .device-op-dialog-btn--cancel.el-button:hover {
  background: #f7fafc;
  border-color: #c0c4cc;
  color: #303133;
}

.device-op-message-box .device-op-dialog-btn--confirm.el-button,
.device-op-message-box .device-op-dialog-btn--confirm.el-button--primary {
  background: #274082;
  border-color: #274082;
  color: #fff;
}

.device-op-message-box .device-op-dialog-btn--confirm.el-button:hover,
.device-op-message-box .device-op-dialog-btn--confirm.el-button--primary:hover {
  background: #1f3468;
  border-color: #1f3468;
  color: #fff;
}
</style>
