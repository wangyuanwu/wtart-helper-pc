<template>
  <el-dialog
    :model-value="modelValue"
    title="报警提示"
    width="420px"
    append-to-body
    align-center
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="alarm-tip-dialog"
    @update:model-value="onVisibleChange"
  >
    <div class="alarm-tip">
      <div class="alarm-tip__name">{{ alarm?.deviceName || '--' }}</div>
      <div class="alarm-tip__line">设备ID:{{ alarm?.deviceCode || '--' }}</div>
      <div class="alarm-tip__event">事件:{{ alarm?.eventDescription || '--' }}</div>
      <label class="alarm-tip__ack" @click.prevent="handled = !handled">
        <span
          class="alarm-tip__radio"
          :class="{ 'is-checked': handled }"
          aria-hidden="true"
        ></span>
        <span class="alarm-tip__ack-text">已处理</span>
      </label>
    </div>
    <template #footer>
      <el-button type="primary" class="alarm-tip__confirm" @click="onConfirm">
        知道了
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 报警提示弹窗（对齐移动端 a-tips-confirm）
 * - 勾选「已处理」+「知道了」→ confirm=true（调 /handle）
 * - 未勾选 +「知道了」→ confirm=false（仅本地 isKnow）
 * - 不可 Esc / 点遮罩 / 右上角关闭
 */
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  alarm: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const handled = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    if (v) handled.value = false
  }
)

function onVisibleChange(v) {
  // 禁止通过 dialog 自身关闭；保持与移动端遮罩不可关一致
  if (!v && props.modelValue) return
  emit('update:modelValue', v)
}

function onConfirm() {
  emit('confirm', { handled: handled.value })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.alarm-tip__name {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.alarm-tip__line {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #303133;
  line-height: 1.5;
}

.alarm-tip__event {
  margin-top: 12px;
  font-size: 14px;
  color: #909399;
  line-height: 1.6;
}

.alarm-tip__ack {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.alarm-tip__radio {
  width: 18px;
  height: 18px;
  border: 2px solid #c0c4cc;
  border-radius: 50%;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.alarm-tip__radio.is-checked {
  border-color: #3653a0;
  background: radial-gradient(circle at center, #3653a0 0 5px, transparent 6px);
}

.alarm-tip__ack-text {
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.alarm-tip__confirm {
  width: 100%;
  height: 40px;
  border-radius: 20px;
  background: #274082;
  border-color: #274082;
  font-weight: 600;
}

.alarm-tip__confirm:hover,
.alarm-tip__confirm:focus {
  background: #1f3468;
  border-color: #1f3468;
}
</style>

<style>
.alarm-tip-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.alarm-tip-dialog .el-dialog__header {
  margin-right: 0;
  padding: 20px 24px 8px;
  text-align: center;
}

.alarm-tip-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.alarm-tip-dialog .el-dialog__body {
  padding: 8px 24px 4px;
}

.alarm-tip-dialog .el-dialog__footer {
  padding: 12px 24px 24px;
}
</style>
