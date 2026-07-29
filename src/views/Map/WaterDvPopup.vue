<template>
  <div
    v-if="visible"
    class="water-dv-popup"
    @click.stop
    @mousedown.stop
  >
    <div v-if="loading && !statusInfo" class="water-dv-popup__loading">
      加载中...
    </div>

    <template v-else-if="statusInfo">
      <!-- 上部：在线/离线共用（标题、查看详情、同步数据、最后同步） -->
      <div class="water-dv-popup__header">
        <div class="water-dv-popup__title-row">
          <h3 class="water-dv-popup__title">{{ statusInfo.name || '出水桩' }}</h3>
          <div class="water-dv-popup__actions">
            <button type="button" class="water-dv-popup__link" @click="onViewDetail">
              查看详情 &gt;
            </button>
            <button type="button" class="water-dv-popup__sync-btn" @click="onSync">
              同步数据
            </button>
          </div>
        </div>
        <p class="water-dv-popup__sync-time">
          最后同步: {{ syncTimeText }}
        </p>
      </div>

      <div class="water-dv-popup__metrics">
        <div class="water-dv-popup__metric">
          <i class="iconfont icon-map_ic_temperature"></i>
          <span>{{ temperatureText }}</span>
        </div>
        <span class="water-dv-popup__metric-sep" aria-hidden="true">|</span>
        <div class="water-dv-popup__metric">
          <i class="iconfont icon-map_ic_signal"></i>
          <span>{{ signalText }}</span>
        </div>
        <span class="water-dv-popup__metric-sep" aria-hidden="true">|</span>
        <div class="water-dv-popup__metric">
          <i class="iconfont icon-map_ic_battery"></i>
          <span :class="{ 'is-good': batteryPercent >= 50 }">
            {{ batteryText }}
          </span>
        </div>
      </div>

      <!-- 在线：设备图 + 压力/流量 + 控制区 -->
      <template v-if="isOnline">
        <div class="water-dv-popup__device">
          <img
            class="water-dv-popup__device-img"
            :src="deviceOnlineImg"
            alt=""
          />
          <div class="water-dv-popup__pressure is-left">
            <span class="water-dv-popup__pressure-val">{{ formatPressure(portA) }}</span>
            <span class="water-dv-popup__pressure-unit">bar</span>
          </div>
          <div class="water-dv-popup__pressure is-right">
            <span class="water-dv-popup__pressure-val">{{ formatPressure(portB) }}</span>
            <span class="water-dv-popup__pressure-unit">bar</span>
          </div>
          <div class="water-dv-popup__flow">
            {{ flowText }}
            <span class="water-dv-popup__flow-unit">m³/h</span>
          </div>
        </div>

        <div class="water-dv-popup__controls">
          <div class="water-dv-popup__pod">
            <div class="water-dv-popup__pod-label">
              <span
                class="water-dv-popup__port-dot"
                :class="{ 'is-on': isPortOpen(portA) }"
              >
                {{ portA?.outletName || 'A' }}
              </span>
              <span>出水口</span>
            </div>
            <button
              type="button"
              class="water-dv-popup__switch"
              :class="{ 'is-on': isPortOpen(portA), 'is-off': !isPortOpen(portA) }"
              @click="onPortToggle(portA)"
            >
              {{ portOpenText(portA) }}
            </button>
          </div>

          <div class="water-dv-popup__pod water-dv-popup__pod--gauge" @click="onEditOpen">
            <div class="water-dv-popup__pod-title">默认开度</div>
            <div class="water-dv-popup__gauge">
              <span class="is-a">{{ defaultOpenText(portA) }}</span>
              <i class="iconfont icon-map_ic_opening water-dv-popup__gauge-icon"></i>
              <span class="is-b">{{ defaultOpenText(portB) }}</span>
            </div>
          </div>

          <div class="water-dv-popup__pod">
            <div class="water-dv-popup__pod-label">
              <span
                class="water-dv-popup__port-dot"
                :class="{ 'is-on': isPortOpen(portB) }"
              >
                {{ portB?.outletName || 'B' }}
              </span>
              <span>出水口</span>
            </div>
            <button
              type="button"
              class="water-dv-popup__switch"
              :class="{ 'is-on': isPortOpen(portB), 'is-off': !isPortOpen(portB) }"
              @click="onPortToggle(portB)"
            >
              {{ portOpenText(portB) }}
            </button>
          </div>
        </div>
      </template>

      <!-- 离线：下部空态（上部与在线一致） -->
      <template v-else>
        <div class="water-dv-popup__offline-body">
          <img
            class="water-dv-popup__device-img is-offline"
            :src="deviceOfflineImg"
            alt=""
          />
          <p class="water-dv-popup__offline-tip">设备暂无出水桩数据</p>
        </div>
      </template>
    </template>

    <div v-else class="water-dv-popup__empty">暂无设备数据</div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getWaterOutletPileStatus } from '@/api/device'
import deviceOnlineImg from '@/assets/map/outlet-device-online.svg'
import deviceOfflineImg from '@/assets/map/outlet-device-offline.svg'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 地图上点击的出水桩设备（至少含 id） */
  device: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const loading = ref(false)
const statusInfo = ref(null)
let pollTimer = null
let requestSeq = 0

const isOnline = computed(() => !!statusInfo.value?.isOnline)

const portA = computed(() => findPort(1))
const portB = computed(() => findPort(2))

const temperatureText = computed(() => {
  const t = statusInfo.value?.temperature
  if (t == null || t === '') return '--'
  const n = Number(t)
  return Number.isFinite(n) ? `${n.toFixed(0)}°C` : `${t}°C`
})

const batteryPercent = computed(() => {
  const v = statusInfo.value?.batteryPercent
  return v == null ? 0 : Number(v)
})

const batteryText = computed(() => `${batteryPercent.value}%`)

const signalText = computed(() => {
  const signal = statusInfo.value?.signal
  if (signal == null) return '--'
  const level = getSignalLevel(Number(signal))
  if (level >= 4) return '强'
  if (level >= 2) return '中'
  if (level >= 1) return '弱'
  return `${signal}dBm`
})

const syncTimeText = computed(() =>
  formatSyncTime(statusInfo.value?.updateTimeUtc)
)

const flowText = computed(() => {
  const flow = statusInfo.value?.waterOutletPile?.flow
  if (flow == null || flow === '') return '0.0'
  const n = Number(flow)
  return Number.isFinite(n) ? n.toFixed(1) : String(flow)
})

function findPort(outletNo) {
  const ports = statusInfo.value?.waterOutletPile?.ports
  if (!Array.isArray(ports)) return null
  return ports.find((p) => Number(p.outletNo) === outletNo) || null
}

function getSignalLevel(val) {
  const sig0 = Number.isFinite(val) ? val : -105
  if (sig0 > -85) return 5
  if (sig0 > -90) return 4
  if (sig0 > -95) return 3
  if (sig0 > -100) return 2
  if (sig0 > -105) return 1
  return 0
}

function formatSyncTime(utc) {
  if (!utc) return '--'
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return '--'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function formatPressure(port) {
  if (!port || port.pressure == null) return '0.00'
  const n = Number(port.pressure)
  return Number.isFinite(n) ? n.toFixed(2) : String(port.pressure)
}

function isPortOpen(port) {
  if (!port) return false
  return Number(port.currentOpening || 0) > 0
}

function portOpenText(port) {
  if (!port) return '关'
  const open = Number(port.currentOpening || 0)
  return open > 0 ? `${Math.round(open)}%` : '关'
}

function defaultOpenText(port) {
  if (!port || port.defaultOpening == null) return '0%'
  return `${Math.round(Number(port.defaultOpening))}%`
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function fetchStatus() {
  const id = props.device?.id
  if (id == null) return
  const seq = ++requestSeq
  loading.value = true
  try {
    const res = await getWaterOutletPileStatus(id)
    if (seq !== requestSeq) return
    statusInfo.value = res?.data || null
  } catch (e) {
    if (seq !== requestSeq) return
    console.error('[WaterDvPopup] 获取出水桩状态失败', e)
    if (!statusInfo.value) {
      ElMessage.error('获取出水桩状态失败')
    }
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function startPoll() {
  // 农场级状态由 Index 的 status-by-farm 轮询维护；
  // 本弹窗仅在点击时用 {id}/status 拉一次详情，不再轮询
}

function openWithDevice() {
  statusInfo.value = null
  fetchStatus()
}

function closePopup() {
  clearPoll()
  statusInfo.value = null
  visible.value = false
  emit('close')
}

function onViewDetail() {
  ElMessage.info('查看详情功能开发中')
}

function onSync() {
  ElMessage.info('同步数据功能开发中')
}

function onPortToggle() {
  ElMessage.info('出水口控制功能开发中')
}

function onEditOpen() {
  ElMessage.info('默认开度设置功能开发中')
}

watch(
  () => [props.modelValue, props.device?.id],
  ([show, id]) => {
    if (show && id != null) {
      openWithDevice()
    } else {
      clearPoll()
      if (!show) statusInfo.value = null
    }
  },
  { immediate: true }
)

/**
 * 农场 status-by-farm 轮询后，把开度/压力/在线态合并进当前弹窗
 * （不对齐 {id}/status 轮询）
 */
function mergeFromFarmDevice(device) {
  if (!statusInfo.value || !device) return
  if (String(statusInfo.value.id) !== String(device.id)) return

  statusInfo.value.isOnline = device.isOnline
  if (device.batteryPercent != null) {
    statusInfo.value.batteryPercent = device.batteryPercent
  }
  if (device.name) statusInfo.value.name = device.name

  const livePorts =
    device.specificData?.waterOutletPile?.ports ||
    device.waterOutletPile?.ports
  const statusPorts = statusInfo.value.waterOutletPile?.ports
  if (!Array.isArray(livePorts) || !Array.isArray(statusPorts)) return

  livePorts.forEach((livePort) => {
    const target = statusPorts.find(
      (p) => String(p.id) === String(livePort.id)
    )
    if (!target) return
    if (livePort.currentOpening != null) {
      target.currentOpening = livePort.currentOpening
    }
    if (livePort.pressure != null) {
      target.pressure = livePort.pressure
    }
  })
}

onUnmounted(() => {
  clearPoll()
})

defineExpose({
  closePopup,
  fetchStatus,
  mergeFromFarmDevice,
  statusInfo
})
</script>

<style scoped>
.water-dv-popup {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1200;
  width: 380px;
  height: 522px;
  box-sizing: border-box;
  padding: 16px 14px 12px;
  border-radius: 14px;
  background: #f5f6f8;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

.water-dv-popup__loading,
.water-dv-popup__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.water-dv-popup__header {
  flex-shrink: 0;
}

.water-dv-popup__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.water-dv-popup__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.water-dv-popup__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.water-dv-popup__link {
  border: none;
  background: transparent;
  color: #2f6bff;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.water-dv-popup__sync-btn {
  border: none;
  background: #fff;
  color: #2f6bff;
  font-size: 12px;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}

.water-dv-popup__sync-time {
  margin: 6px 0 0;
  font-size: 12px;
  color: #999;
}

.water-dv-popup__metrics {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 0;
  width: fit-content;
  max-width: 100%;
  padding: 8px 12px;
  background: #fff;
  border-radius: 20px;
  flex-shrink: 0;
}

.water-dv-popup__metric {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #333;
  white-space: nowrap;
}

.water-dv-popup__metric-sep {
  margin: 0 10px;
  color: #d0d0d0;
  font-size: 12px;
  line-height: 1;
  user-select: none;
}

.water-dv-popup__metric .iconfont {
  font-size: 14px;
  color: #666;
}

.water-dv-popup__metric .is-good {
  color: #22c55e;
  font-weight: 600;
}

.water-dv-popup__device {
  position: relative;
  flex: 1;
  min-height: 0;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.water-dv-popup__device-img {
  width: 168px;
  height: 168px;
  object-fit: contain;
  display: block;
  user-select: none;
  pointer-events: none;
}

.water-dv-popup__device-img.is-offline {
  width: 180px;
  height: 180px;
  opacity: 0.85;
}

.water-dv-popup__pressure {
  position: absolute;
  top: 42%;
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.water-dv-popup__pressure.is-left {
  left: 8px;
}

.water-dv-popup__pressure.is-right {
  right: 8px;
}

.water-dv-popup__pressure-val {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.water-dv-popup__pressure-unit {
  font-size: 12px;
  color: #999;
}

.water-dv-popup__flow {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
}

.water-dv-popup__flow-unit {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 500;
  color: #999;
}

.water-dv-popup__controls {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.water-dv-popup__pod {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 10px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 88px;
  box-sizing: border-box;
}

.water-dv-popup__pod--gauge {
  cursor: pointer;
}

.water-dv-popup__pod-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.water-dv-popup__pod-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.water-dv-popup__port-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #888;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.water-dv-popup__port-dot.is-on {
  background: #2f6bff;
}

.water-dv-popup__switch {
  border: none;
  border-radius: 16px;
  min-width: 56px;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
}

.water-dv-popup__switch.is-on {
  background: #22c55e;
}

.water-dv-popup__switch.is-off {
  background: #ef4444;
}

.water-dv-popup__gauge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.water-dv-popup__gauge .is-a {
  color: #2f6bff;
  font-weight: 600;
}

.water-dv-popup__gauge .is-b {
  color: #999;
  font-weight: 600;
}

.water-dv-popup__gauge-icon {
  font-size: 22px;
  color: #c0c4cc;
}

.water-dv-popup__offline-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.water-dv-popup__offline-tip {
  margin: 0;
  font-size: 13px;
  color: #b0b0b0;
}
</style>
