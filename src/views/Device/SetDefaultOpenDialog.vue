<template>
  <el-dialog
    :model-value="modelValue"
    title="开度设置"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="set-default-open-dialog"
    @update:model-value="onVisibleChange"
  >
    <div class="set-default-open-dialog__body">
      <div class="set-default-open-dialog__col">
        <div class="set-default-open-dialog__label">目标开度</div>
        <div class="set-default-open-dialog__value">{{ percentA }}%</div>
        <el-slider
          v-model="percentA"
          vertical
          height="280px"
          :min="0"
          :max="100"
          :step="1"
          :show-tooltip="false"
        />
        <span class="set-default-open-dialog__badge">A</span>
        <div class="set-default-open-dialog__port">出水口</div>
        <div class="set-default-open-dialog__current">当前 {{ openA }}%</div>
      </div>

      <div class="set-default-open-dialog__scale" aria-hidden="true">
        <span v-for="n in scaleMarks" :key="n">{{ n }}</span>
      </div>

      <div class="set-default-open-dialog__col">
        <div class="set-default-open-dialog__label">目标开度</div>
        <div class="set-default-open-dialog__value">{{ percentB }}%</div>
        <el-slider
          v-model="percentB"
          vertical
          height="280px"
          :min="0"
          :max="100"
          :step="1"
          :show-tooltip="false"
        />
        <span class="set-default-open-dialog__badge">B</span>
        <div class="set-default-open-dialog__port">出水口</div>
        <div class="set-default-open-dialog__current">当前 {{ openB }}%</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="onVisibleChange(false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateDefaultOpening } from '@/api/device'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** status 接口完整数据 */
  statusInfo: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const percentA = ref(0)
const percentB = ref(0)
const openA = ref(0)
const openB = ref(0)
const saving = ref(false)
/** 中间刻度：100 → 0，对齐设计稿 */
const scaleMarks = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0]

function findPort(outletNo) {
  const ports = props.statusInfo?.waterOutletPile?.ports
  if (!Array.isArray(ports)) return null
  return ports.find((p) => Number(p.outletNo) === outletNo) || null
}

function initFromStatus() {
  const a = findPort(1)
  const b = findPort(2)
  percentA.value = Math.round(Number(a?.defaultOpening) || 0)
  percentB.value = Math.round(Number(b?.defaultOpening) || 0)
  openA.value = Math.round(Number(a?.currentOpening) || 0)
  openB.value = Math.round(Number(b?.currentOpening) || 0)
}

function onVisibleChange(v) {
  emit('update:modelValue', v)
}

async function onSave() {
  const pile = props.statusInfo?.waterOutletPile
  const a = findPort(1)
  const b = findPort(2)
  if (!pile?.id || !a?.id || !b?.id) {
    ElMessage.warning('设备数据异常')
    return
  }
  saving.value = true
  try {
    await updateDefaultOpening(
      {
        waterOutletId: pile.id,
        ports: [
          { portId: a.id, defaultOpening: percentA.value },
          { portId: b.id, defaultOpening: percentB.value }
        ]
      },
      { loading: true }
    )
    ElMessage.success('操作成功')
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    console.error('[SetDefaultOpenDialog] 保存失败', e)
  } finally {
    saving.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) initFromStatus()
  }
)
</script>

<style scoped>
.set-default-open-dialog__body {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: stretch;
  padding: 8px 8px 16px;
}

.set-default-open-dialog__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 160px;
}

.set-default-open-dialog__label {
  font-size: 13px;
  color: #909399;
}

.set-default-open-dialog__value {
  margin-top: 4px;
  margin-bottom: 12px;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

/* 竖直滑块容器 */
.set-default-open-dialog__col :deep(.el-slider.is-vertical) {
  height: 280px;
  margin: 0 0 16px;
}

/* 加宽竖直轨道 */
.set-default-open-dialog__col :deep(.el-slider.is-vertical .el-slider__runway) {
  width: 48px;
  margin: 0;
  border-radius: 10px;
  background-color: #e8edf2;
}

.set-default-open-dialog__col :deep(.el-slider.is-vertical .el-slider__bar) {
  width: 48px;
  border-radius: 10px;
  left: 0;
  background-color: #3653a0;
}

.set-default-open-dialog__col
  :deep(.el-slider.is-vertical .el-slider__button-wrapper) {
  left: 50%;
  width: 56px;
  height: 28px;
  transform: translate(-50%, 50%);
}

.set-default-open-dialog__col :deep(.el-slider.is-vertical .el-slider__button) {
  width: 56px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
}

/* 中间 0–100 刻度 */
.set-default-open-dialog__scale {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 36px;
  /* 对齐滑块高度：目标开度文案 + 数值 + 滑块 */
  margin-top: 58px;
  margin-bottom: 78px;
  height: 280px;
  font-size: 12px;
  color: #a8abb2;
  line-height: 1;
  user-select: none;
  flex-shrink: 0;
}

.set-default-open-dialog__badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3653a0;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.set-default-open-dialog__port {
  margin-top: 8px;
  font-size: 14px;
  color: #303133;
}

.set-default-open-dialog__current {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
