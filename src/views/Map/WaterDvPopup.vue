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
        <!-- PC 需求：弹窗暂不展示地址（逆地理逻辑保留） -->
      </div>

      <div
        class="water-dv-popup__body"
        :class="{ 'is-offline': !isOnline, 'is-valve-busy': valveBusy }"
      >
        <div class="water-dv-popup__metrics">
          <div class="water-dv-popup__metric">
            <i class="iconfont icon-map_ic_temperature"></i>
            <span>{{ temperatureText }}</span>
          </div>
          <span class="water-dv-popup__metric-sep" aria-hidden="true">|</span>
          <div class="water-dv-popup__metric">
            <i class="iconfont icon-map_ic_signal"></i>
            <span>{{ signalText }}</span>
            <span v-if="snrText" class="water-dv-popup__snr">{{ snrText }}</span>
          </div>
          <span class="water-dv-popup__metric-sep" aria-hidden="true">|</span>
          <div class="water-dv-popup__metric">
            <i class="iconfont icon-map_ic_battery"></i>
            <span :class="{ 'is-good': batteryPercent >= 50, 'is-charging': isCharging }">
              {{ batteryText }}
            </span>
          </div>
        </div>

        <!-- 有水桩数据：设备图 + 压力/流量 + 控制区 -->
        <template v-if="hasWaterOutletPile">
          <div class="water-dv-popup__device">
            <img
              class="water-dv-popup__device-img"
              :src="deviceOnlineImg"
              alt=""
            />
            <span
              class="water-dv-popup__outlet-marker is-left"
              :class="{ 'is-on': isPortOpen(portA) }"
            >
              {{ portA?.outletName || 'A' }}
            </span>
            <span
              class="water-dv-popup__outlet-marker is-right"
              :class="{ 'is-on': isPortOpen(portB) }"
            >
              {{ portB?.outletName || 'B' }}
            </span>
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
            <i
              v-if="isDvAlarm"
              class="iconfont icon-lujing-1 water-dv-popup__alarm"
              aria-hidden="true"
            ></i>
            <button
              v-if="isManualMode"
              type="button"
              class="water-dv-popup__manual-exit"
              @click="onExitManualMode"
            >
              退出
            </button>
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
              <div
                class="water-dv-popup__port-switch"
                :class="{ 'is-busy': valveBusy }"
              >
                <el-switch
                  :model-value="isPortOpen(portA)"
                  :disabled="valveBusy || portToggleLoading"
                  inline-prompt
                  :active-text="portOpenText(portA)"
                  inactive-text="关"
                  active-color="#22c55e"
                  inactive-color="#ef4444"
                  @change="(val) => onPortSwitchChange(portA, val)"
                />
              </div>
            </div>

            <div
              class="water-dv-popup__pod water-dv-popup__pod--gauge"
              :class="{ 'is-disabled': valveBusy }"
              @click="onEditOpen"
            >
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
              <div
                class="water-dv-popup__port-switch"
                :class="{ 'is-busy': valveBusy }"
              >
                <el-switch
                  :model-value="isPortOpen(portB)"
                  :disabled="valveBusy || portToggleLoading"
                  inline-prompt
                  :active-text="portOpenText(portB)"
                  inactive-text="关"
                  active-color="#22c55e"
                  inactive-color="#ef4444"
                  @change="(val) => onPortSwitchChange(portB, val)"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 无水桩数据：空态 -->
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
      </div>
    </template>

    <div v-else class="water-dv-popup__empty">暂无设备数据</div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElSwitch } from 'element-plus'
import {
  closeRestartDv,
  closeWaterDv,
  getWaterOutletPileStatus,
  openWaterDv,
  syncWaterOutletStatus
} from '@/api/device'
import { useFarmStore } from '@/store/farm'
import { useAlarmStore } from '@/store/alarm'
import deviceOnlineImg from '@/assets/map/outlet-device-online.svg'
import deviceOfflineImg from '@/assets/map/outlet-device-offline.svg'

const POLL_MS = 3000

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 地图上点击的出水桩设备（至少含 id） */
  device: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'close'])

const router = useRouter()
const farmStore = useFarmStore()
const alarmStore = useAlarmStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const loading = ref(false)
const portToggleLoading = ref(false)
const statusInfo = ref(null)
const controlWaterOutletList = ref({})
const closeOpenOrderCache = ref(null)
const controlWaterOutletCache = ref(null)

let pollTimer = null
let requestSeq = 0

const isOnline = computed(() => !!statusInfo.value?.isOnline)
const hasWaterOutletPile = computed(() => !!statusInfo.value?.waterOutletPile)
const valveAction = computed(() => statusInfo.value?.waterOutletPile?.valveAction ?? 0)
const valveBusy = computed(() => valveAction.value !== 0)
const isManualMode = computed(() => Number(statusInfo.value?.ds) === 9)
const isCharging = computed(() => Number(statusInfo.value?.chargingStatus) === 1)

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

const batteryText = computed(() => {
  if (isCharging.value) return '充电中'
  return `${batteryPercent.value}%`
})

const signalText = computed(() => {
  const signal = statusInfo.value?.signal
  if (signal == null) return '--'
  const level = getSignalLevel(Number(signal))
  if (level >= 4) return '强'
  if (level >= 2) return '中'
  if (level >= 1) return '弱'
  return `${signal}dBm`
})

const snrText = computed(() => {
  const snr = statusInfo.value?.snr
  if (snr == null || snr === '') return ''
  return `(${snr})`
})

const isDvAlarm = computed(() => {
  const deviceId = statusInfo.value?.id ?? props.device?.id
  return alarmStore.isDvAlarm(deviceId)
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

function getWaterOutletId() {
  return (
    statusInfo.value?.waterOutletPile?.id ||
    props.device?.specificData?.waterOutletPile?.id ||
    null
  )
}

function getReplace0(oldWaterOut, waterOut) {
  if (!Array.isArray(waterOut.ports) || waterOut.ports.length < 2) return false
  const portA = waterOut.ports[0]
  const portB = waterOut.ports[1]
  const action = oldWaterOut.valveAction

  if (action === 1) {
    return Math.round(portA.currentOpening || 0) >= Math.round(portA.defaultOpening || 0)
  }
  if (action === 3) {
    return Math.round(portB.currentOpening || 0) >= Math.round(portB.defaultOpening || 0)
  }
  if (action === 2) {
    return Math.round(portA.currentOpening || 0) <= 0
  }
  if (action === 4) {
    return Math.round(portB.currentOpening || 0) <= 0
  }
  if (action === 99) return true
  return false
}

function mergeStatusData(oldDev, newDev) {
  if (!oldDev || !newDev) return
  if (!newDev.waterOutletPile) return

  const waterOut = newDev.waterOutletPile
  const oldWaterOut = controlWaterOutletList.value[waterOut.id]

  if (oldWaterOut) {
    if (oldWaterOut.valveAction !== 0 && waterOut.valveAction === 0) {
      let isReplace = false
      if (waterOut.outletType === 0) {
        isReplace = getReplace0(oldWaterOut, waterOut)
      }
      if (isReplace) {
        Object.assign(oldDev, newDev)
        delete controlWaterOutletList.value[waterOut.id]
      }
    } else {
      const oldPorts = oldDev.waterOutletPile?.ports
      if (!Array.isArray(waterOut.ports) || !Array.isArray(oldPorts)) return
      waterOut.ports.forEach((newPort) => {
        const oldPort = oldPorts.find((p) => p.outletNo === newPort.outletNo)
        if (oldPort) {
          oldPort.currentOpening = newPort.currentOpening
          oldPort.pressure = newPort.pressure
        }
      })
      if (oldDev.waterOutletPile) {
        oldDev.waterOutletPile.valveAction = waterOut.valveAction
        oldDev.waterOutletPile.flow = waterOut.flow
      }
    }
  } else {
    Object.assign(oldDev, newDev)
  }
}

function applyPortOpenFlags() {
  const pile = statusInfo.value?.waterOutletPile
  if (!pile || pile.outletType !== 0) return
  if (controlWaterOutletList.value[pile.id]) return
  const a = findPort(1)
  const b = findPort(2)
  if (a) a.isOpen = isPortOpen(a)
  if (b) b.isOpen = isPortOpen(b)
}

async function fetchStatus(options = {}) {
  const { showLoading = false, isRefresh = false } = options
  const id = props.device?.id
  if (id == null) return

  const seq = ++requestSeq
  if (showLoading) loading.value = true

  try {
    const res = await getWaterOutletPileStatus(id)
    if (seq !== requestSeq) return

    const data = res?.data || null
    if (!data) return

    if (!statusInfo.value || isRefresh) {
      statusInfo.value = data
    } else {
      mergeStatusData(statusInfo.value, data)
    }

    if (data.waterOutletPile) {
      applyPortOpenFlags()
    }
  } catch (e) {
    if (seq !== requestSeq) return
    console.error('[WaterDvPopup] 获取出水桩状态失败', e)
    if (!statusInfo.value) {
      ElMessage.error('获取出水桩状态失败')
    }
  } finally {
    if (seq === requestSeq && showLoading) loading.value = false
  }
}

function startPoll() {
  clearPoll()
  pollTimer = setInterval(() => {
    if (visible.value && props.device?.id != null) {
      fetchStatus({ silent: true })
    }
  }, POLL_MS)
}

function openWithDevice() {
  controlWaterOutletList.value = {}
  closeOpenOrderCache.value = null
  controlWaterOutletCache.value = null
  statusInfo.value = null
  fetchStatus({ showLoading: true, isRefresh: true })
  startPoll()
}

function closePopup() {
  clearPoll()
  controlWaterOutletList.value = {}
  closeOpenOrderCache.value = null
  controlWaterOutletCache.value = null
  statusInfo.value = null
  visible.value = false
  emit('close')
}

/** 对齐移动端 toDeviceControl：写入 vuex_control_device_info 后进 control_device */
function onViewDetail() {
  // 以地图点击设备为准（对齐移动端 open 弹窗前写入的 vuex_control_device_info）
  const device = props.device
  if (!device?.id) {
    ElMessage.warning('缺少设备信息')
    return
  }
  farmStore.setControlDevice({ ...device })
  closePopup()
  router.push({
    path: '/device/control',
    query: { id: String(device.id) }
  })
}

async function onSync() {
  const waterOutletId = getWaterOutletId()
  if (waterOutletId == null) {
    ElMessage.warning('设备信息异常')
    return
  }
  try {
    await syncWaterOutletStatus({ waterOutletId }, { silent: true })
    ElMessage.success('操作成功')
  } catch (e) {
    ElMessage.error(e?.message || '同步失败')
  }
}

function onEditOpen() {
  if (!hasWaterOutletPile.value) {
    ElMessage.warning('暂无设备数据')
    return
  }
  if (valveBusy.value) {
    ElMessage.warning('阀门开关过程中，无法修改默认开度')
    return
  }
  ElMessage.info('默认开度设置功能开发中')
}

async function onExitManualMode() {
  const waterOutletId = getWaterOutletId()
  if (waterOutletId == null) return
  try {
    await ElMessageBox.confirm(
      '退出手动模式后，将无法进行手动操作。是否退出手动模式？',
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await closeRestartDv({ waterOutletId, oper: 3 }, { loading: true, silent: true })
    ElMessage.success('操作成功')
    await fetchStatus({ isRefresh: true })
  } catch (e) {
    if (e === 'cancel' || e?.message === 'cancel') return
    ElMessage.error(e?.message || '操作失败')
  }
}

function controlWaterOutType0(controlWaterOutlet, portId, status) {
  const ports = controlWaterOutlet.ports
  if (!Array.isArray(ports) || ports.length < 2) return

  const portA = ports.find((p) => Number(p.outletNo) === 1) || ports[0]
  const portB = ports.find((p) => Number(p.outletNo) === 2) || ports[1]
  let controlPort = null
  let otherPort = null

  if (String(portA.id) === String(portId)) {
    controlPort = portA
    otherPort = portB
  } else if (String(portB.id) === String(portId)) {
    controlPort = portB
    otherPort = portA
  }
  if (!controlPort) return

  controlWaterOutletList.value[controlWaterOutlet.id] = controlWaterOutlet

  if (status) {
    controlPort.isOpen = true
    if (otherPort) otherPort.isOpen = false
    controlWaterOutlet.valveAction = Number(controlPort.outletNo) === 1 ? 1 : 3
    const order = {
      force: false,
      waterOutletId: controlWaterOutlet.id,
      outPorts: [{
        outletNo: controlPort.outletNo,
        opening: controlPort.defaultOpening || 0
      }]
    }
    openWaterDvHttp(order, controlWaterOutlet)
  } else {
    controlPort.isOpen = false
    controlWaterOutlet.valveAction = Number(controlPort.outletNo) === 1 ? 2 : 4
    const order = {
      force: false,
      waterOutletId: controlWaterOutlet.id,
      outPorts: [{ outletNo: controlPort.outletNo }]
    }
    closeWaterDvHttp(order, controlWaterOutlet)
  }
}

function onPortSwitchChange(port, nextOpen) {
  if (!port || valveBusy.value || portToggleLoading.value) return
  const pile = statusInfo.value?.waterOutletPile
  if (!pile) {
    ElMessage.warning('设备数据异常，无法操作')
    return
  }
  if (nextOpen === isPortOpen(port)) return
  if (pile.outletType === 0) {
    controlWaterOutType0(pile, port.id, nextOpen)
  }
}

async function openWaterDvHttp(order, controlWaterOutlet) {
  closeOpenOrderCache.value = order
  controlWaterOutletCache.value = controlWaterOutlet
  portToggleLoading.value = true
  try {
    await openWaterDv(order, { loading: true, silent: true })
    ElMessage.success('操作成功')
  } catch (e) {
    if (e?.code === 40102) {
      try {
        await ElMessageBox.confirm(
          '系统监测到该地块下其它出水口处于关闭状态，仍打开当前出水口可能会出现爆管风险。是否强制打开？',
          '提示',
          { confirmButtonText: '强制打开', cancelButtonText: '取消', type: 'warning' }
        )
        const retryOrder = { ...closeOpenOrderCache.value, force: true }
        await openWaterDv(retryOrder, { loading: true, silent: true })
        ElMessage.success('操作成功')
      } catch (err) {
        if (err !== 'cancel' && err?.message !== 'cancel') {
          ElMessage.error(err?.message || '操作失败')
        }
        delete controlWaterOutletList.value[controlWaterOutlet.id]
        if (statusInfo.value?.waterOutletPile) {
          statusInfo.value.waterOutletPile.valveAction = 0
        }
      }
    } else {
      delete controlWaterOutletList.value[controlWaterOutlet.id]
      if (statusInfo.value?.waterOutletPile) {
        statusInfo.value.waterOutletPile.valveAction = 0
      }
      ElMessage.error(e?.message || '操作失败')
    }
  } finally {
    portToggleLoading.value = false
  }
}

async function closeWaterDvHttp(order, controlWaterOutlet) {
  closeOpenOrderCache.value = order
  controlWaterOutletCache.value = controlWaterOutlet
  portToggleLoading.value = true
  try {
    await closeWaterDv(order, { loading: true, silent: true })
    ElMessage.success('操作成功')
  } catch (e) {
    if (e?.code === 40102) {
      try {
        await ElMessageBox.confirm(
          `${e?.message || '关闭失败'}，是否强制关闭？`,
          '提示',
          { confirmButtonText: '强制关闭', cancelButtonText: '取消', type: 'warning' }
        )
        const retryOrder = { ...closeOpenOrderCache.value, force: true }
        await closeWaterDv(retryOrder, { loading: true, silent: true })
        ElMessage.success('操作成功')
      } catch (err) {
        if (err !== 'cancel' && err?.message !== 'cancel') {
          ElMessage.error(err?.message || '操作失败')
        }
        delete controlWaterOutletList.value[controlWaterOutlet.id]
        if (statusInfo.value?.waterOutletPile) {
          statusInfo.value.waterOutletPile.valveAction = 0
        }
      }
    } else {
      delete controlWaterOutletList.value[controlWaterOutlet.id]
      if (statusInfo.value?.waterOutletPile) {
        statusInfo.value.waterOutletPile.valveAction = 0
      }
      ElMessage.error(e?.message || '操作失败')
    }
  } finally {
    portToggleLoading.value = false
  }
}

watch(
  () => [props.modelValue, props.device?.id],
  ([show, id]) => {
    if (show && id != null) {
      openWithDevice()
    } else {
      clearPoll()
      if (!show) {
        controlWaterOutletList.value = {}
        statusInfo.value = null
      }
    }
  },
  { immediate: true }
)

/**
 * 农场 status-by-farm 轮询后，把开度/压力/在线态合并进当前弹窗
 */
function mergeFromFarmDevice(device) {
  if (!statusInfo.value || !device) return
  if (String(statusInfo.value.id) !== String(device.id)) return

  statusInfo.value.isOnline = device.isOnline
  if (device.batteryPercent != null) {
    statusInfo.value.batteryPercent = device.batteryPercent
  }
  if (device.name) statusInfo.value.name = device.name
  if (device.address) statusInfo.value.address = device.address

  const livePile =
    device.specificData?.waterOutletPile || device.waterOutletPile
  if (!livePile || !statusInfo.value.waterOutletPile) return

  const livePorts = livePile.ports
  const statusPorts = statusInfo.value.waterOutletPile.ports
  if (!Array.isArray(livePorts) || !Array.isArray(statusPorts)) return

  const pileId = statusInfo.value.waterOutletPile.id
  const inControl = controlWaterOutletList.value[pileId]

  if (inControl && inControl.valveAction !== 0) {
    livePorts.forEach((livePort) => {
      const target = statusPorts.find((p) => String(p.id) === String(livePort.id))
      if (!target) return
      if (livePort.currentOpening != null) target.currentOpening = livePort.currentOpening
      if (livePort.pressure != null) target.pressure = livePort.pressure
    })
  } else {
    livePorts.forEach((livePort) => {
      const target = statusPorts.find((p) => String(p.id) === String(livePort.id))
      if (!target) return
      if (livePort.currentOpening != null) target.currentOpening = livePort.currentOpening
      if (livePort.pressure != null) target.pressure = livePort.pressure
    })
    if (livePile.valveAction != null) {
      statusInfo.value.waterOutletPile.valveAction = livePile.valveAction
    }
  }
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

.water-dv-popup__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.water-dv-popup__body.is-offline {
  opacity: 0.72;
  pointer-events: none;
}

@keyframes water-dv-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
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

.water-dv-popup__metric .is-charging {
  color: #2f6bff;
  font-weight: 600;
}

.water-dv-popup__snr {
  margin-left: 2px;
  font-size: 11px;
  color: #999;
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

.water-dv-popup__outlet-marker {
  position: absolute;
  top: 18%;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #bbb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  z-index: 2;
  user-select: none;
  pointer-events: none;
}

.water-dv-popup__outlet-marker.is-left {
  left: 34%;
}

.water-dv-popup__outlet-marker.is-right {
  right: 34%;
}

.water-dv-popup__outlet-marker.is-on {
  background: #2f6bff;
}

.water-dv-popup__alarm {
  position: absolute;
  right: 24px;
  bottom: 38px;
  font-size: 18px;
  color: #ef4444;
  line-height: 1;
  z-index: 2;
}

.water-dv-popup__manual-exit {
  position: absolute;
  bottom: 8px;
  right: 24px;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
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

.water-dv-popup__pod--gauge.is-disabled {
  cursor: not-allowed;
  opacity: 0.65;
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

.water-dv-popup__port-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.water-dv-popup__port-switch.is-busy :deep(.el-switch) {
  animation: water-dv-blink 1s ease-in-out infinite;
}

.water-dv-popup__port-switch :deep(.el-switch) {
  --el-switch-on-color: #22c55e;
  --el-switch-off-color: #ef4444;
  height: 28px;
}

.water-dv-popup__port-switch :deep(.el-switch__core) {
  min-width: 56px;
  height: 28px;
  border-radius: 16px;
}

.water-dv-popup__port-switch :deep(.el-switch.is-checked .el-switch__core .el-switch__inner) {
  padding-left: 6px;
  padding-right: 22px;
}

.water-dv-popup__port-switch :deep(.el-switch__core .el-switch__inner) {
  padding-right: 6px;
  padding-left: 22px;
}

.water-dv-popup__port-switch :deep(.el-switch__core .el-switch__inner .is-text) {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.water-dv-popup__port-switch :deep(.el-switch__core .el-switch__action) {
  width: 22px;
  height: 22px;
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
