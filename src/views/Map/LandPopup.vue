<template>
  <div
    v-if="visible"
    class="land-popup"
    @click.stop
    @mousedown.stop
  >
    <div class="land-popup__header">
      <div class="land-popup__header-main">
        <h3 class="land-popup__title">{{ landName }}</h3>
        <div class="land-popup__farm">
          <i class="iconfont icon-farm_ic_locate_02"></i>
          <span>所属农场：{{ farmName }}</span>
        </div>
      </div>
      <button
        type="button"
        class="land-popup__close"
        title="关闭"
        @click="onClose"
      >
        <i class="iconfont icon-shanchu"></i>
      </button>
    </div>

    <div class="land-popup__stats">
      <div class="land-popup__stat">
        <div class="land-popup__stat-label">总面积</div>
        <div class="land-popup__stat-value">
          <span class="land-popup__stat-num">{{ areaText }}</span>
          <span class="land-popup__stat-unit">亩</span>
        </div>
      </div>
      <div class="land-popup__stat-divider" aria-hidden="true"></div>
      <div class="land-popup__stat">
        <div class="land-popup__stat-label">智能设备</div>
        <div class="land-popup__stat-value">
          <span class="land-popup__stat-num">{{ deviceCount }}</span>
          <span class="land-popup__stat-unit">个</span>
        </div>
      </div>
    </div>

    <button type="button" class="land-popup__edit" @click="onEditLand">
      编辑地块
      <span class="land-popup__edit-arrow">→</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 点击的地块（含 id / name / area / deviceIds 等） */
  land: { type: Object, default: null },
  /** 当前农场信息（含 name / devices） */
  farmInfo: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'close', 'edit'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const landName = computed(() => props.land?.name || '未命名地块')

const farmName = computed(
  () => props.farmInfo?.name || props.farmInfo?.farmName || '未知农场'
)

/** 面积：直接使用 API area 字段（单位：亩） */
const areaText = computed(() => {
  const land = props.land
  if (!land) return '0.00'
  if (land.area != null && land.area !== '') {
    const num = Number(land.area)
    if (Number.isFinite(num)) return num.toFixed(2)
  }
  if (land.areaMu != null && land.areaMu !== '') {
    return Number(land.areaMu).toFixed(2)
  }
  return '0.00'
})

/**
 * 设备数：按当前农场 devices 中 landId === 地块 id 统计
 * （对齐移动端 deviceIds / 农场设备绑定地块）
 */
const deviceCount = computed(() => {
  const landId = props.land?.id
  if (landId == null) return 0

  const devices = props.farmInfo?.devices
  if (Array.isArray(devices) && devices.length) {
    return devices.filter((d) => String(d.landId) === String(landId)).length
  }

  const ids = props.land?.deviceIds
  return Array.isArray(ids) ? ids.length : 0
})

const onClose = () => {
  visible.value = false
  emit('close')
}

const onEditLand = () => {
  emit('edit', {
    id: props.land?.id,
    name: landName.value,
    areaMu: areaText.value,
    deviceCount: deviceCount.value,
    land: props.land
  })
}
</script>

<style scoped>
.land-popup {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1200;
  width: 360px;
  box-sizing: border-box;
  padding: 16px 16px 14px;
  border-radius: 12px;
  background: #f5f6f8;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
  pointer-events: auto;
}

.land-popup__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.land-popup__header-main {
  flex: 1;
  min-width: 0;
}

.land-popup__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  word-break: break-all;
}

.land-popup__farm {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

.land-popup__farm .iconfont {
  color: #2f6bff;
  font-size: 14px;
  flex-shrink: 0;
}

.land-popup__close {
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.land-popup__close .iconfont {
  font-size: 18px;
}

.land-popup__close:hover {
  color: #909399;
}

.land-popup__stats {
  margin-top: 16px;
  display: flex;
  align-items: stretch;
  padding: 14px 0;
  background: #fff;
  border-radius: 10px;
}

.land-popup__stat {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.land-popup__stat-label {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.land-popup__stat-value {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
}

.land-popup__stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.land-popup__stat-unit {
  font-size: 13px;
  color: #666;
}

.land-popup__stat-divider {
  width: 1px;
  background: #ebeef5;
  margin: 4px 0;
  flex-shrink: 0;
}

.land-popup__edit {
  margin-top: 14px;
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #2f6bff;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.land-popup__edit:hover {
  background: #2560e8;
}

.land-popup__edit-arrow {
  font-size: 16px;
  line-height: 1;
}
</style>
