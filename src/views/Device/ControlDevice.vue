<template>
  <div class="control-device" :class="{ 'is-offline': !isOnline }">
    <div v-if="loading && !statusInfo" class="control-device__loading">加载中...</div>

    <template v-else-if="statusInfo">
      <!-- 顶栏 -->
      <div class="control-device__header">
        <div class="control-device__header-left">
          <div class="control-device__name-row">
            <button type="button" class="control-device__back" @click="onBack">
              ← 返回
            </button>
            <h2 class="control-device__title">{{ displayName }}</h2>
          </div>
          <span
            class="control-device__online"
            :class="isOnline ? 'is-on' : 'is-off'"
          >
            <i class="control-device__online-dot"></i>
            {{ isOnline ? '在线' : '离线' }}
          </span>
          <button
            type="button"
            class="control-device__location"
            @click="onOpenMap"
          >
            <el-icon><Location /></el-icon>
            <span>{{ locationText }}</span>
          </button>
        </div>
        <div class="control-device__header-right">
          <el-button type="primary" class="control-device__sync" @click="onSync">
            <el-icon><Refresh /></el-icon>
            立即同步
          </el-button>
          <el-button class="control-device__edit" @click="onEditDevice">
            <i class="iconfont icon-a-device_ic_edit1"></i>
            编辑出水桩
          </el-button>
        </div>
      </div>

      <div class="control-device__main">
        <!-- 左侧 -->
        <div class="control-device__left">
          <div class="control-device__viz card">
            <div class="control-device__metrics">
              <i
                v-if="isManualMode"
                class="iconfont icon-a-lujing1 control-device__manual-icon"
                title="手动模式"
              ></i>
              <span class="control-device__metric">
                <i class="iconfont icon-map_ic_temperature"></i>
                {{ temperatureText }}
              </span>
              <span class="control-device__metric">
                <i class="iconfont icon-map_ic_signal"></i>
                {{ signalText }}
                <span v-if="snrText" class="control-device__snr">{{ snrText }}</span>
              </span>
              <span
                class="control-device__metric"
                :class="{ 'is-low': batteryPercent <= 20 }"
              >
                <i class="iconfont icon-map_ic_battery"></i>
                {{ batteryText }}
              </span>
            </div>

            <div class="control-device__device-wrap">
              <img
                class="control-device__device-img"
                :src="isOnline ? outletOnlineImg : outletOfflineImg"
                alt=""
              />
              <div class="control-device__device-meta">
                <div>同步时间：{{ syncTimeText }}</div>
                <div>设备编号：{{ deviceCodeText }}</div>
              </div>
              <div class="control-device__port-overlay is-a">
                <span
                  class="control-device__port-marker"
                  :class="{ 'is-on': isPortOpen(portA) }"
                >
                  {{ portLabel(portA, 'A') }}
                </span>
                <div class="control-device__pressure">
                  <span class="control-device__pressure-val">
                    {{ formatPressure(portA) }}
                  </span>
                  <span class="control-device__pressure-units">
                    <em>bar</em>
                    <em>公斤</em>
                  </span>
                </div>
              </div>
              <div class="control-device__port-overlay is-b">
                <span
                  class="control-device__port-marker"
                  :class="{ 'is-on': isPortOpen(portB) }"
                >
                  {{ portLabel(portB, 'B') }}
                </span>
                <div class="control-device__pressure">
                  <span class="control-device__pressure-val">
                    {{ formatPressure(portB) }}
                  </span>
                  <span class="control-device__pressure-units">
                    <em>bar</em>
                    <em>公斤</em>
                  </span>
                </div>
              </div>
              <div class="control-device__flow">
                {{ flowText }}
                <em>m³/h</em>
              </div>
              <div v-if="isDvAlarm" class="control-device__alarm">
                <i class="iconfont icon-lujing-1" title="告警中"></i>
                <span
                  v-if="alarmEventText"
                  class="control-device__alarm-desc"
                >
                  {{ alarmEventText }}
                </span>
              </div>
              <button
                v-if="isManualMode"
                type="button"
                class="control-device__manual-exit"
                @click="onExitManual"
              >
                退出
              </button>
            </div>
          </div>

          <div class="control-device__nav-row">
            <button
              type="button"
              class="control-device__nav-card card"
              @click="onRecord"
            >
              <i class="iconfont icon-device_ic_record"></i>
              <span>灌溉记录</span>
            </button>
            <button
              type="button"
              class="control-device__nav-card card"
              @click="onTimerControl"
            >
              <i class="iconfont icon-device_ic_timing"></i>
              <span>定时控制</span>
            </button>
          </div>
        </div>

        <!-- 右侧 -->
        <div class="control-device__right">
          <!-- 状态 -->
          <div v-if="showStatusPanel" class="control-device__status card">
            <div class="control-device__status-title">状态</div>
            <div class="control-device__status-body">
              <div
                class="control-device__run-ring"
                :class="{ 'is-running': isRunning }"
              >
                <img
                  class="control-device__run-disc"
                  :class="{ 'is-rotate': isRunning }"
                  :src="runningDiscImg"
                  alt=""
                />
                <div class="control-device__run-ring-inner">
                  <i class="iconfont" :class="runIconClass"></i>
                  <span>{{ runLabel }}</span>
                </div>
              </div>
              <div class="control-device__status-info">
                <template v-if="isRunning">
                  <div class="control-device__stat">
                    <span class="control-device__stat-label">运行时长</span>
                    <span class="control-device__stat-value">{{ runTimeText }}</span>
                  </div>
                  <div class="control-device__stat">
                    <span class="control-device__stat-label">累计流量</span>
                    <span class="control-device__stat-value">
                      {{ accumulatedFlowText }}
                    </span>
                  </div>
                </template>
                <template v-else-if="nextRunTimeText">
                  <div class="control-device__stat is-next">
                    <span class="control-device__stat-label">下次启动时间</span>
                    <span class="control-device__stat-value">
                      {{ nextRunDateText }}
                      <strong>{{ nextRunClockText }}</strong>
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- A/B 开关 -->
          <div
            v-if="hasWaterOutletPile"
            class="control-device__switches"
            :class="{ 'is-valve-busy': valveBusy }"
          >
            <div
              v-if="portA"
              class="control-device__switch-card card"
              :class="portSwitchClass(portA)"
            >
              <span class="control-device__switch-label">
                {{ portLabel(portA, 'A') }} 出水口
              </span>
              <div
                class="control-device__switch-wrap"
                :class="{ 'is-blink': valveBusy }"
              >
                <el-switch
                  :model-value="isPortOpen(portA)"
                  :disabled="isPortSwitchDisabled"
                  inline-prompt
                  :active-text="`${portOpenPct(portA)}%`"
                  inactive-text="关"
                  @change="(val) => onPortSwitch(portA, val)"
                />
                <span class="control-device__switch-badge">
                  {{ portLabel(portA, 'A') }}
                </span>
              </div>
            </div>
            <div
              v-if="portB"
              class="control-device__switch-card card"
              :class="portSwitchClass(portB)"
            >
              <span class="control-device__switch-label">
                {{ portLabel(portB, 'B') }} 出水口
              </span>
              <div
                class="control-device__switch-wrap"
                :class="{ 'is-blink': valveBusy }"
              >
                <el-switch
                  :model-value="isPortOpen(portB)"
                  :disabled="isPortSwitchDisabled"
                  inline-prompt
                  :active-text="`${portOpenPct(portB)}%`"
                  inactive-text="关"
                  @change="(val) => onPortSwitch(portB, val)"
                />
                <span class="control-device__switch-badge">
                  {{ portLabel(portB, 'B') }}
                </span>
              </div>
            </div>
          </div>

          <!-- 开度设置 -->
          <div
            v-if="hasWaterOutletPile"
            class="control-device__opening card"
            :class="{ 'is-offline-disabled': !isOnline }"
            @click="onEditOpening"
          >
            <div class="control-device__opening-title">
              <i class="iconfont icon-map_ic_opening"></i>
              <span>开度设置</span>
            </div>
            <div class="control-device__opening-row">
              <span class="control-device__opening-name">
                {{ portLabel(portA, 'A') }} 默认开度
              </span>
              <div class="control-device__opening-bar">
                <div
                  class="control-device__opening-fill"
                  :style="{ width: `${defaultOpenPct(portA)}%` }"
                ></div>
              </div>
              <span class="control-device__opening-pct">
                {{ defaultOpenPct(portA) }}%
              </span>
            </div>
            <div class="control-device__opening-row">
              <span class="control-device__opening-name">
                {{ portLabel(portB, 'B') }} 默认开度
              </span>
              <div class="control-device__opening-bar">
                <div
                  class="control-device__opening-fill"
                  :style="{ width: `${defaultOpenPct(portB)}%` }"
                ></div>
              </div>
              <span class="control-device__opening-pct">
                {{ defaultOpenPct(portB) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="control-device__empty">暂无设备数据</div>

    <SetDefaultOpenDialog
      v-model="openDialogVisible"
      :status-info="statusInfo"
      @saved="onOpeningSaved"
    />

    <SwitchRecordDialog
      v-model="recordVisible"
      :target-id="deviceId"
      :target-type="0"
    />

    <TimerProListDialog
      v-model="timerListVisible"
      from="device"
      :target-id="deviceId"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Location, Refresh } from '@element-plus/icons-vue'
import { useFarmStore } from '@/store/farm'
import { useAlarmStore } from '@/store/alarm'
import {
  closeRestartDv,
  getDeviceDetail,
  getWaterOutletPileStatus,
  syncWaterOutletStatus
} from '@/api/device'
import { useWaterOutletValve } from '@/composables/useWaterOutletValve'
import {
  isPortOpen,
  mergeDeviceStatus,
  setPortsOpenStatus
} from '@/utils/waterOutletMerge'
import SetDefaultOpenDialog from './SetDefaultOpenDialog.vue'
import SwitchRecordDialog from '@/views/IrrigationGroup/SwitchRecordDialog.vue'
import TimerProListDialog from '@/views/IrrigationGroup/TimerProListDialog.vue'
import outletOnlineImg from '@/assets/map/outlet-device-online.svg'
import outletOfflineImg from '@/assets/map/outlet-device-offline.svg'
import runningDiscImg from '@/assets/device/device_img_running.png'

const POLL_MS = 3000

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()
const alarmStore = useAlarmStore()
const {
  controlWaterOutletList,
  isLockControl,
  handlePileSwitchChange,
  resetControlState
} = useWaterOutletValve()

const deviceInfo = ref(null)
const statusInfo = ref(null)
const loading = ref(false)
const openDialogVisible = ref(false)
const recordVisible = ref(false)
const timerListVisible = ref(false)
const tickNow = ref(Date.now())

/** 对齐移动端 isDvAlarm(dvStatusInfo.id) */
const isDvAlarm = computed(() =>
  alarmStore.isDvAlarm(statusInfo.value?.id ?? deviceInfo.value?.id)
)

const alarmEventText = computed(
  () =>
    alarmStore.getDvAlarmBean(statusInfo.value?.id ?? deviceInfo.value?.id)
      ?.eventDescription || ''
)

let pollTimer = null
let tickTimer = null
let requestSeq = 0
let offFarmChange = null

const deviceId = computed(
  () => route.query.id ?? deviceInfo.value?.id ?? farmStore.s_control_device?.id
)

const displayName = computed(
  () => statusInfo.value?.name || deviceInfo.value?.name || '出水桩'
)

const isOnline = computed(
  () => !!(statusInfo.value?.isOnline ?? deviceInfo.value?.isOnline)
)

const hasWaterOutletPile = computed(() => !!statusInfo.value?.waterOutletPile)
const valveAction = computed(
  () => statusInfo.value?.waterOutletPile?.valveAction ?? 0
)
const valveBusy = computed(() => Number(valveAction.value) !== 0)
const isManualMode = computed(() => Number(statusInfo.value?.ds) === 9)
const isCharging = computed(
  () => Number(statusInfo.value?.chargingStatus) === 1
)

const portA = computed(() => findPort(1))
const portB = computed(() => findPort(2))

const locationText = computed(() => {
  const s = statusInfo.value
  const d = deviceInfo.value
  return (
    s?.address ||
    d?.address ||
    s?.landName ||
    d?.landName ||
    '查看地图位置'
  )
})

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

const chargingCurrentText = computed(() => {
  const v =
    statusInfo.value?.chargingCurrent ??
    statusInfo.value?.waterOutletPile?.chargingCurrent
  if (v == null || v === '') return ''
  return `${v}mA`
})

const batteryText = computed(() => {
  const percent = `${batteryPercent.value}%`
  if (!isCharging.value) return percent
  return chargingCurrentText.value
    ? `${percent} | ${chargingCurrentText.value}`
    : percent
})

const snrText = computed(() => {
  const snr = statusInfo.value?.snr
  if (snr == null || snr === '') return ''
  return `(${snr})`
})

const syncTimeText = computed(() =>
  formatSyncTime(statusInfo.value?.updateTimeUtc)
)

const deviceCodeText = computed(
  () => statusInfo.value?.deviceCode || deviceInfo.value?.deviceCode || '--'
)

const signalText = computed(() => {
  const signal = statusInfo.value?.signal
  if (signal == null) return '--'
  const level = getSignalLevel(Number(signal))
  if (level >= 4) return '信号良好'
  if (level >= 2) return '信号一般'
  if (level >= 1) return '信号较弱'
  return `${signal}dBm`
})

const flowText = computed(() => {
  const flow = statusInfo.value?.waterOutletPile?.flow
  if (flow == null || flow === '') return '0.0'
  const n = Number(flow)
  return Number.isFinite(n) ? n.toFixed(1) : String(flow)
})

const runtime = computed(
  () => statusInfo.value?.waterOutletPile?.deviceRuntime || null
)
const nextRun = computed(
  () => statusInfo.value?.waterOutletPile?.deviceNexRunTime || null
)
const isRunning = computed(() => !!runtime.value?.isRunning)

const showStatusPanel = computed(() => {
  if (!isOnline.value || !hasWaterOutletPile.value) return false
  return isRunning.value || !!nextRun.value
})

const runMeta = computed(() => {
  const empty = { icon: 'icon-device_ic_timing', label: '--' }
  const pile = statusInfo.value?.waterOutletPile
  if (!pile) return empty

  let tiggerObject
  let mode
  if (pile.deviceRuntime?.isRunning) {
    tiggerObject = pile.deviceRuntime.tiggerObject
    mode = pile.deviceRuntime.mode
  } else if (pile.deviceNexRunTime) {
    tiggerObject = pile.deviceNexRunTime.tiggerObject
    mode = pile.deviceNexRunTime.mode
  } else {
    return empty
  }

  if (Number(tiggerObject) === 2) {
    return { icon: 'icon-home_ic_foot_program_01', label: '自动轮灌' }
  }
  if (Number(mode) === 0) {
    return { icon: 'icon-device_ic_manual', label: '手动' }
  }
  if (Number(mode) === 1) {
    return { icon: 'icon-device_ic_timing', label: '定时' }
  }
  return empty
})

const runIconClass = computed(() => runMeta.value.icon)
const runLabel = computed(() => runMeta.value.label)

const runTimeText = computed(() => {
  void tickNow.value
  const start = runtime.value?.startTime
  if (!start) return '--'
  return calcRunTime(formatUtc(start))
})

const accumulatedFlowText = computed(() => {
  const v = runtime.value?.accumulatedFlow
  if (v == null) return '--'
  const n = Number(v)
  return Number.isFinite(n) ? `${n.toFixed(1)}m³` : `${v}m³`
})

const nextRunTimeText = computed(() => nextRun.value?.nextRunTime || '')

const nextRunDateText = computed(() => {
  const t = nextRunTimeText.value
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return String(t).slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

const nextRunClockText = computed(() => {
  const t = nextRunTimeText.value
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
})

const isPortSwitchDisabled = computed(
  () => !isOnline.value || isLockControl.value || valveBusy.value
)

function findPort(outletNo) {
  const ports = statusInfo.value?.waterOutletPile?.ports
  if (!Array.isArray(ports)) return null
  return ports.find((p) => Number(p.outletNo) === outletNo) || null
}

function portLabel(port, fallback) {
  return port?.outletName || fallback
}

function portOpenPct(port) {
  return Math.round(Number(port?.currentOpening) || 0)
}

function defaultOpenPct(port) {
  return Math.round(Number(port?.defaultOpening) || 0)
}

function formatPressure(port) {
  if (!port || port.pressure == null) return '0'
  const n = Number(port.pressure)
  if (!Number.isFinite(n)) return String(port.pressure)
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function portSwitchClass(port) {
  if (!isOnline.value) return 'is-muted'
  return isPortOpen(port) ? 'is-open' : 'is-closed'
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

function formatUtc(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}

/** 对齐移动端 formatUtcCustom(..., 'MM/dd hh:mm') */
function formatSyncTime(utcStr) {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function calcRunTime(startTimeStr) {
  const start = new Date(startTimeStr).getTime()
  if (!Number.isFinite(start)) return '--'
  const diffMs = Date.now() - start
  if (diffMs <= 0) return '00:00:00'
  const diffS = Math.floor(diffMs / 1000)
  const day = Math.floor(diffS / (3600 * 24))
  const h = Math.floor((diffS % (3600 * 24)) / 3600)
  const m = Math.floor((diffS % 3600) / 60)
  const s = diffS % 60
  const pad = (n) => String(n).padStart(2, '0')
  const timeStr = `${pad(h)}:${pad(m)}:${pad(s)}`
  return day > 0 ? `${day}天 ${timeStr}` : timeStr
}

function getWaterOutletId() {
  return (
    statusInfo.value?.waterOutletPile?.id ||
    deviceInfo.value?.specificData?.waterOutletPile?.id ||
    null
  )
}

function applyOpenFlags() {
  const pile = statusInfo.value?.waterOutletPile
  if (!pile) return
  if (controlWaterOutletList.value[pile.id]) return
  setPortsOpenStatus(pile)
}

async function fetchStatus({ showLoading = false, isRefresh = false } = {}) {
  const id = deviceId.value
  if (id == null) return

  const seq = ++requestSeq
  if (showLoading) loading.value = true

  try {
    const res = await getWaterOutletPileStatus(id, {
      silent: !showLoading
    })
    if (seq !== requestSeq) return
    const data = res?.data || null
    if (!data) return

    if (!statusInfo.value || isRefresh) {
      statusInfo.value = data
      setPortsOpenStatus(statusInfo.value.waterOutletPile)
    } else {
      mergeDeviceStatus(
        statusInfo.value,
        data,
        controlWaterOutletList.value
      )
    }
    applyOpenFlags()

    if (statusInfo.value?.name && deviceInfo.value) {
      deviceInfo.value.name = statusInfo.value.name
    }
    if (statusInfo.value?.isOnline != null && deviceInfo.value) {
      deviceInfo.value.isOnline = statusInfo.value.isOnline
    }
  } catch (e) {
    if (seq !== requestSeq) return
    console.error('[ControlDevice] 获取状态失败', e)
    if (!statusInfo.value) {
      ElMessage.error('获取设备状态失败')
    }
  } finally {
    if (seq === requestSeq && showLoading) loading.value = false
  }
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPoll() {
  clearPoll()
  pollTimer = setInterval(() => {
    fetchStatus({ showLoading: false })
  }, POLL_MS)
}

function onPortSwitch(port, val) {
  const pile = statusInfo.value?.waterOutletPile
  if (!pile || !port) return
  if (val === isPortOpen(port)) return
  handlePileSwitchChange(pile, port.id, val, {
    ds: statusInfo.value?.ds
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

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/device')
}

function onOpenMap() {
  const id = deviceId.value
  if (id == null) return
  farmStore.setPendingMapDeviceId(id)
  router.push('/map')
}

function onEditDevice() {
  const id = deviceId.value
  if (id == null) {
    ElMessage.warning('缺少设备信息')
    return
  }
  router.push({
    path: '/device/detail',
    query: { id: String(id) }
  })
}

function onRecord() {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('缺少设备信息')
    return
  }
  // 对齐移动端：record_page?from=device 读 vuex_control_device_info
  if (deviceInfo.value) {
    farmStore.setControlDevice(deviceInfo.value)
  }
  recordVisible.value = true
}

function onTimerControl() {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('缺少设备信息')
    return
  }
  // 对齐移动端：pro_list?from=device 读 vuex_control_device_info
  if (deviceInfo.value) {
    farmStore.setControlDevice(deviceInfo.value)
  }
  if (statusInfo.value) {
    farmStore.setDvStatusInfo(statusInfo.value)
  }
  timerListVisible.value = true
}

function onEditOpening() {
  if (!isOnline.value) return
  if (!hasWaterOutletPile.value) {
    ElMessage.warning('暂无设备数据')
    return
  }
  if (valveBusy.value) {
    ElMessage.warning('阀门开关过程中，无法修改默认开度')
    return
  }
  farmStore.setDvStatusInfo(statusInfo.value)
  openDialogVisible.value = true
}

async function onOpeningSaved() {
  await fetchStatus({ isRefresh: true })
}

async function onExitManual() {
  const waterOutletId = getWaterOutletId()
  if (waterOutletId == null) return
  try {
    await ElMessageBox.confirm(
      '退出手动模式后，将无法进行手动操作。是否退出手动模式？',
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await closeRestartDv(
      { waterOutletId, oper: 3 },
      { loading: true, silent: true }
    )
    ElMessage.success('操作成功')
    await fetchStatus({ isRefresh: true })
  } catch (e) {
    if (e === 'cancel' || e?.message === 'cancel') return
    ElMessage.error(e?.message || '操作失败')
  }
}

async function bootstrap() {
  resetControlState()
  statusInfo.value = null
  clearPoll()

  const cached = farmStore.s_control_device
  const id = route.query.id ?? cached?.id
  if (id == null) {
    ElMessage.warning('缺少设备信息')
    router.replace('/device')
    return
  }

  if (cached && String(cached.id) === String(id)) {
    deviceInfo.value = { ...cached }
  } else {
    try {
      const res = await getDeviceDetail(id)
      deviceInfo.value = res?.data || { id }
      farmStore.setControlDevice(deviceInfo.value)
    } catch (e) {
      console.error('[ControlDevice] 获取设备详情失败', e)
      deviceInfo.value = { id }
    }
  }

  await fetchStatus({ showLoading: true, isRefresh: true })
  startPoll()
}

function handleFarmChange() {
  router.replace('/device')
}

onMounted(() => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)
  tickTimer = setInterval(() => {
    tickNow.value = Date.now()
  }, 1000)
  bootstrap()
})

onUnmounted(() => {
  offFarmChange?.()
  clearPoll()
  resetControlState()
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
})

watch(
  () => route.query.id,
  (id, prev) => {
    if (id != null && String(id) !== String(prev)) {
      bootstrap()
    }
  }
)
</script>

<style scoped>
.control-device {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 20px 24px 24px;
  background: #f7fafc;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-device__loading,
.control-device__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.control-device__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.control-device__header-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.control-device__name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.control-device__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.control-device__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-device__online {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.control-device__online.is-on {
  background: rgba(0, 201, 112, 0.12);
  color: #00c970;
}

.control-device__online.is-off {
  background: #f0f2f5;
  color: #909399;
}

.control-device__online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.control-device__location {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
  max-width: 320px;
}

.control-device__location span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-device__location:hover {
  color: #3653a0;
}

.control-device__header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.control-device__sync {
  --el-button-bg-color: #3653a0;
  --el-button-border-color: #3653a0;
  --el-button-hover-bg-color: #2f4a90;
  --el-button-hover-border-color: #2f4a90;
  height: 40px;
  border-radius: 10px;
  font-weight: 600;
}

.control-device__edit {
  height: 40px;
  border-radius: 10px;
  font-weight: 600;
  color: #3653a0;
  border-color: #d0d7e8;
}

.control-device__edit .iconfont {
  margin-right: 4px;
  font-size: 14px;
}

.control-device__main {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
  gap: 16px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
}

.control-device__left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  min-height: 0;
}

.control-device__viz {
  position: relative;
  padding: 20px;
  min-height: 420px;
  flex: 1;
}

.control-device__metrics {
  display: flex;
  align-items: center;
  gap: 20px;
  color: #606266;
  font-size: 14px;
  font-weight: 600;
}

.control-device__manual-icon {
  font-size: 18px;
  color: #ef4444;
  line-height: 1;
  flex-shrink: 0;
}

.control-device__metric {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.control-device__snr {
  margin-left: 2px;
  font-weight: 500;
  color: #909399;
}

.control-device__metric .iconfont {
  font-size: 16px;
  color: #3653a0;
}

.control-device__metric.is-low {
  color: #f56c6c;
}

.control-device__device-wrap {
  position: relative;
  margin-top: 12px;
  height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-device__device-meta {
  position: absolute;
  top: 8px;
  left: 12px;
  z-index: 2;
  font-size: 14px;
  line-height: 1.6;
  color: #909399;
}

.control-device__device-img {
  width: 220px;
  height: 260px;
  object-fit: contain;
}

.control-device__port-overlay {
  position: absolute;
  top: 28%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.control-device__port-overlay.is-a {
  left: 18%;
}

.control-device__port-overlay.is-b {
  right: 18%;
}

.control-device__port-marker {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #c0c4cc;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.control-device__port-marker.is-on {
  background: #3653a0;
}

.control-device__pressure {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #303133;
}

.control-device__pressure-val {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.control-device__pressure-units {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.15;
}

.control-device__pressure-units em,
.control-device__flow em {
  font-style: normal;
  font-size: 12px;
  font-weight: 500;
  color: #909399;
}

.control-device__flow {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 36px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1;
}

.control-device__alarm {
  position: absolute;
  left: 16px;
  bottom: 56px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 140px;
  text-align: center;
}

.control-device__alarm .iconfont {
  font-size: 20px;
  color: #ef4444;
  line-height: 1;
}

.control-device__alarm-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  word-break: break-word;
}

.control-device__manual-exit {
  position: absolute;
  right: 24px;
  bottom: 48px;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.control-device__nav-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex-shrink: 0;
}

.control-device__nav-card {
  height: 72px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.control-device__nav-card .iconfont {
  font-size: 22px;
  color: #3653a0;
}

.control-device__nav-card:hover {
  background: #f5f7fa;
}

.control-device__right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.control-device__status {
  padding: 16px 18px 20px;
  flex-shrink: 0;
}

.control-device__status-title {
  font-size: 14px;
  font-weight: 700;
  color: #909399;
  margin-bottom: 12px;
}

.control-device__status-body {
  display: flex;
  align-items: center;
  gap: 20px;
}

.control-device__run-ring {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.control-device__run-disc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.control-device__run-disc.is-rotate {
  animation: control-run-spin 10s linear infinite;
}

.control-device__run-ring-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #606266;
  font-size: 13px;
  font-weight: 700;
  z-index: 1;
  pointer-events: none;
  padding: 0 14px;
  box-sizing: border-box;
  text-align: center;
}

.control-device__run-ring-inner span {
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.control-device__run-ring-inner .iconfont {
  font-size: 26px;
  color: #606266;
  line-height: 1;
}

@keyframes control-run-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.control-device__status-info {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 24px;
}

.control-device__stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-device__stat.is-next {
  flex: 1;
}

.control-device__stat-label {
  font-size: 13px;
  color: #909399;
}

.control-device__stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1.2;
}

.control-device__stat-value strong {
  margin-left: 8px;
  font-size: 32px;
}

.control-device__switches {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}

.control-device__switch-card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.control-device__switch-label {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}

.control-device__switch-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.control-device__switch-wrap :deep(.el-switch) {
  --el-switch-on-color: #00c970;
  --el-switch-off-color: #ff2f30;
  height: 36px;
}

.control-device__switch-wrap :deep(.el-switch__core) {
  min-width: 110px;
  height: 36px;
  border-radius: 18px;
}

.control-device__switch-wrap :deep(.el-switch__action) {
  opacity: 0;
}

.control-device__switch-badge {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  color: #3653a0;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.control-device__switch-card.is-open .control-device__switch-badge,
.control-device__switch-card.is-closed .control-device__switch-badge {
  left: 3px;
}

.control-device__switch-card.is-open .control-device__switch-wrap :deep(.el-switch__core) {
  padding-left: 36px;
}

.control-device__switch-card.is-closed .control-device__switch-wrap :deep(.el-switch__core) {
  padding-left: 36px;
}

.control-device__switch-card.is-muted .control-device__switch-badge {
  background: #f5f6f8;
  color: #a8abb2;
}

.control-device__switches.is-valve-busy .is-blink :deep(.el-switch__core) {
  animation: control-valve-blink 1s ease-in-out infinite;
}

@keyframes control-valve-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.control-device__opening {
  flex: 1;
  min-height: 72px;
  padding: 16px 18px 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-device__opening:hover {
  background: #fafbfc;
}

.control-device__opening.is-offline-disabled {
  cursor: not-allowed;
  pointer-events: none;
}

.control-device__opening.is-offline-disabled:hover {
  background: #fff;
}

.control-device__opening-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}

.control-device__opening-title .iconfont {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(54, 83, 160, 0.12);
  color: #3653a0;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.control-device__opening-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 0 16px;
  border-radius: 12px;
  background: #f0f4f7;
  box-sizing: border-box;
}

.control-device__opening-name {
  width: 88px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.control-device__opening-bar {
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: #dde3ea;
  overflow: hidden;
}

.control-device__opening-fill {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #7aa0ff, #3653a0);
}

.control-device__opening-pct {
  width: 44px;
  text-align: right;
  font-size: 15px;
  font-weight: 700;
  color: #3653a0;
}

.control-device.is-offline .control-device__viz,
.control-device.is-offline .control-device__switches,
.control-device.is-offline .control-device__opening {
  opacity: 0.72;
}

@media (max-width: 1100px) {
  .control-device__main {
    grid-template-columns: 1fr;
  }
}
</style>
