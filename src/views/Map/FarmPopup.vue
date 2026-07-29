<template>
  <div
    v-if="visible"
    class="farm-popup"
    @click.stop
    @mousedown.stop
  >
    <div class="farm-popup__header">
      <h3 class="farm-popup__title">{{ displayName }}</h3>
      <button
        type="button"
        class="farm-popup__close"
        title="关闭"
        @click="onClose"
      >
        <i class="iconfont icon-shanchu"></i>
      </button>
    </div>

    <div class="farm-popup__address">
      <i class="iconfont icon-farm_ic_locate_02"></i>
      <span>{{ displayAddress }}</span>
    </div>

    <div v-if="loading" class="farm-popup__loading">加载中...</div>

    <template v-else>
      <div class="farm-popup__stats">
        <div class="farm-popup__stat">
          <div class="farm-popup__stat-label">地块数量</div>
          <div class="farm-popup__stat-value">{{ landCount }} 块</div>
        </div>
        <div class="farm-popup__stat-divider" aria-hidden="true"></div>
        <div class="farm-popup__stat">
          <div class="farm-popup__stat-label">总面积</div>
          <div class="farm-popup__stat-value">{{ areaText }} 亩</div>
        </div>
        <div class="farm-popup__stat-divider" aria-hidden="true"></div>
        <div class="farm-popup__stat">
          <div class="farm-popup__stat-label">智能设备</div>
          <div class="farm-popup__stat-value">{{ deviceCount }} 个</div>
        </div>
      </div>

      <button
        v-if="!isCurrentFarm"
        type="button"
        class="farm-popup__enter"
        @click="onEnterFarm"
      >
        进入农场
        <span class="farm-popup__enter-arrow">→</span>
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 点击的农场基础信息 */
  farm: { type: Object, default: null },
  /** /api/farm/{id}/full 返回的详情 */
  farmDetail: { type: Object, default: null },
  /** 是否为当前选中农场 */
  isCurrentFarm: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'close', 'enter'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const displayName = computed(
  () => props.farmDetail?.name || props.farm?.name || '未知农场'
)

const displayAddress = computed(() => {
  const detail = props.farmDetail || {}
  const base = props.farm || {}
  return (
    detail.address ||
    detail.location ||
    detail.farmAddress ||
    base.address ||
    base.location ||
    '暂无位置信息'
  )
})

const landCount = computed(() => {
  const lands = props.farmDetail?.lands
  return Array.isArray(lands) ? lands.length : 0
})

const areaText = computed(() => {
  if (props.farmDetail?.totalAreaMu != null) {
    return props.farmDetail.totalAreaMu
  }
  const lands = props.farmDetail?.lands
  if (!Array.isArray(lands) || !lands.length) {
    return props.farm?.totalAreaMu || '0.00'
  }
  const areaMu = lands.reduce((sum, land) => {
    const areaSqm = Number(land.area) || 0
    return sum + areaSqm / 666.67
  }, 0)
  return areaMu.toFixed(2)
})

const deviceCount = computed(() => {
  const devices = props.farmDetail?.devices
  if (Array.isArray(devices)) return devices.length
  return props.farm?.deviceCount ?? 0
})

const onClose = () => {
  visible.value = false
  emit('close')
}

const onEnterFarm = () => {
  emit('enter', props.farmDetail || props.farm)
}
</script>

<style scoped>
.farm-popup {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1200;
  width: 360px;
  box-sizing: border-box;
  padding: 16px 16px 14px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
  pointer-events: auto;
}

.farm-popup__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.farm-popup__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.farm-popup__close {
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.farm-popup__close .iconfont {
  font-size: 18px;
}

.farm-popup__close:hover {
  color: #909399;
}

.farm-popup__address {
  margin-top: 8px;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

.farm-popup__address .iconfont {
  color: #2f6bff;
  font-size: 14px;
  margin-top: 1px;
  flex-shrink: 0;
}

.farm-popup__loading {
  margin-top: 24px;
  padding: 20px 0;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.farm-popup__stats {
  margin-top: 16px;
  display: flex;
  align-items: stretch;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.farm-popup__stat {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.farm-popup__stat-label {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.farm-popup__stat-value {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.farm-popup__stat-divider {
  width: 1px;
  background: #ebeef5;
  margin: 2px 0;
  flex-shrink: 0;
}

.farm-popup__enter {
  margin-top: 16px;
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

.farm-popup__enter:hover {
  background: #2560e8;
}

.farm-popup__enter-arrow {
  font-size: 16px;
  line-height: 1;
}
</style>
