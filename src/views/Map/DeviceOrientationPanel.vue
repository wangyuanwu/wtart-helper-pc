<template>
  <div v-if="modelValue" class="orient-panel">
    <div class="orient-panel__header">
      <h3 class="orient-panel__title">添加出水桩</h3>
      <button type="button" class="orient-panel__close" @click="close">×</button>
    </div>

    <div class="orient-panel__hint">
      <span>如下图所示</span>
      <el-icon class="orient-panel__hint-icon" :size="14"><InfoFilled /></el-icon>
      <span>鼠标点击，确定出水口朝向</span>
    </div>

    <div class="orient-panel__compass">
      <div class="orient-panel__ring">
        <button
          v-for="dir in directions"
          :key="dir.text"
          type="button"
          class="orient-panel__dir"
          :class="{ 'is-checked': selected.text === dir.text }"
          :style="dirStyle(dir)"
          @click="selectDir(dir)"
        >
          {{ dir.text }}
        </button>

        <div
          class="orient-panel__pointer-wrap"
          :style="{ transform: `rotate(${selected.deg}deg)` }"
        >
          <div class="orient-panel__pointer"></div>
        </div>

        <div class="orient-panel__center">
          <img class="orient-panel__device" :src="positionImg" alt="" />
        </div>
      </div>
    </div>

    <div class="orient-panel__footer">
      <button type="button" class="orient-panel__confirm" @click="onConfirm">
        确定朝向
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import positionImg from '@/assets/device/add/position.svg'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 弹窗视觉角度（对齐移动端 viewAngle = store - 45） */
  viewAngle: { type: Number, default: 0 },
  /** 批量添加（>1 台）时为 true */
  isAllSet: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'confirm-all'])

const directions = [
  { text: '北', deg: 0 },
  { text: '东北', deg: 45 },
  { text: '东', deg: 90 },
  { text: '东南', deg: 135 },
  { text: '南', deg: 180 },
  { text: '西南', deg: 225 },
  { text: '西', deg: 270 },
  { text: '西北', deg: 315 }
]

const selected = reactive({ text: '北', deg: 0 })

function normalizeAngle(angle) {
  const num = Number(angle) || 0
  return ((num % 360) + 360) % 360
}

function getStableDirection(deg) {
  const d = normalizeAngle(deg)
  if (d >= 337.5 || d < 22.5) return directions[0]
  if (d >= 22.5 && d < 67.5) return directions[1]
  if (d >= 67.5 && d < 112.5) return directions[2]
  if (d >= 112.5 && d < 157.5) return directions[3]
  if (d >= 157.5 && d < 202.5) return directions[4]
  if (d >= 202.5 && d < 247.5) return directions[5]
  if (d >= 247.5 && d < 292.5) return directions[6]
  return directions[7]
}

function dirStyle(dir) {
  const rad = ((dir.deg - 90) * Math.PI) / 180
  const r = 118
  const x = Math.cos(rad) * r
  const y = Math.sin(rad) * r
  return {
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`
  }
}

function selectDir(dir) {
  selected.text = dir.text
  selected.deg = dir.deg
}

function close() {
  emit('update:modelValue', false)
}

/** 单台直接确认；批量则走 confirm-all（父级弹批量提示） */
function onConfirm() {
  const payload = { deg: selected.deg, text: selected.text }
  if (props.isAllSet) {
    emit('confirm-all', payload)
  } else {
    emit('confirm', payload)
  }
}

watch(
  () => [props.modelValue, props.viewAngle],
  ([visible]) => {
    if (!visible) return
    const dir = getStableDirection(props.viewAngle)
    selected.text = dir.text
    selected.deg = dir.deg
  },
  { immediate: true }
)
</script>

<style scoped>
.orient-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 30;
  width: 380px;
  height: 597px;
  box-sizing: border-box;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  padding: 18px 16px 20px;
}

.orient-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.orient-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.orient-panel__close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #909399;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.orient-panel__close:hover {
  color: #606266;
}

.orient-panel__hint {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.orient-panel__hint-icon {
  color: #909399;
}

.orient-panel__compass {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.orient-panel__ring {
  position: relative;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
}

.orient-panel__dir {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  z-index: 3;
  padding: 0;
}

.orient-panel__dir.is-checked {
  background: #3653a0;
  color: #fff;
}

.orient-panel__pointer-wrap {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  transition: transform 0.2s ease;
}

.orient-panel__pointer {
  position: absolute;
  left: 50%;
  top: 16px;
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 12px solid #5b8def;
  transform: translateX(-50%);
}

.orient-panel__center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.orient-panel__device {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.orient-panel__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}

.orient-panel__confirm {
  min-width: 200px;
  height: 40px;
  border: none;
  border-radius: 20px;
  background: #3653a0;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.orient-panel__confirm:hover {
  background: #2d4590;
}
</style>
