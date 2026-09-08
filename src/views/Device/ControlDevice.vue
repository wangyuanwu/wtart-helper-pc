<template>
  <div class="control-device" :class="{ 'is-offline': !isOnline }">
    <div v-if="loading && !statusInfo" class="control-device__loading">加载中...</div>

    <template v-else-if="statusInfo">
      <!-- 顶栏 -->
      <div class="control-device__header">
        <div class="control-device__header-left">
          <div class="control-device__header-info">
            <div class="control-device__name-row">
              <button type="button" class="control-device__back" @click="onBack">
                ← 返回
              </button>
              <h2 class="control-device__title">{{ displayName }}</h2>
              <span class="control-device__device-code">
                设备编号：{{ deviceCodeText }}
              </span>
            </div>
            <div class="control-device__header-sub">
              <span
                class="control-device__online"
                :class="isOnline ? 'is-on' : 'is-off'"
              >
                <i class="control-device__online-dot"></i>
                {{ isOnline ? '在线' : '离线' }}
              </span>
              <button
                type="button"
                class="control-device__edit-inline"
                @click="onEditDevice"
              >
                <i class="iconfont icon-a-device_ic_edit1"></i>
                编辑出水桩
              </button>
            </div>
          </div>
        </div>
        <div class="control-device__header-right">
          <button type="button" class="control-device__map-btn" @click="onOpenMap">
            打开地图
          </button>
        </div>
      </div>

      <div class="control-device__main">
        <!-- 左侧 -->
        <div class="control-device__left">
          <div class="control-device__viz card">
            <div class="control-device__viz-top">
              <div class="control-device__metrics-capsule">
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
                  {{ signalPowerText }}
                </span>
                <span
                  class="control-device__metric control-device__metric--battery"
                  :class="{ 'is-low': batteryPercent <= 20 }"
                >
                  <i class="iconfont icon-map_ic_battery"></i>
                  {{ batteryDisplayText }}
                </span>
              </div>
              <div class="control-device__sync-bar">
                <span class="control-device__sync-time">
                  同步时间：
                  <span class="control-device__sync-time-value">{{ syncTimeText }}</span>
                </span>
                <button
                  type="button"
                  class="control-device__sync-link"
                  @click="onSync"
                >
                  立即同步
                </button>
              </div>
            </div>

            <div class="control-device__device-wrap">
              <img
                class="control-device__device-img"
                :src="isOnline ? outletOnlineImg : outletOfflineImg"
                alt=""
              />
              <div
                class="control-device__port-overlay is-a"
                :class="isPortOpen(portA) ? 'is-on' : 'is-off'"
              >
                <span class="control-device__port-marker">
                  {{ portLabel(portA, 'A') }}
                </span>
                <div class="control-device__pressure">
                  <span class="control-device__pressure-val">
                    {{ formatPressure(portA) }}
                  </span>
                  <span class="control-device__pressure-units">
                    <em>公斤</em>
                    <em>bar</em>
                  </span>
                </div>
              </div>
              <div
                class="control-device__port-overlay is-b"
                :class="isPortOpen(portB) ? 'is-on' : 'is-off'"
              >
                <span class="control-device__port-marker">
                  {{ portLabel(portB, 'B') }}
                </span>
                <div class="control-device__pressure">
                  <span class="control-device__pressure-val">
                    {{ formatPressure(portB) }}
                  </span>
                  <span class="control-device__pressure-units">
                    <em>公斤</em>
                    <em>bar</em>
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

            <div
              v-if="hasWaterOutletPile"
              class="control-device__bottom-row"
              :class="{ 'is-valve-busy': valveBusy }"
            >
              <div
                v-if="portA"
                class="control-device__bottom-item control-device__switch-compact"
                :class="portSwitchClass(portA)"
              >
                <span class="control-device__switch-compact-label">
                  出水口 {{ portLabel(portA, 'A') }}
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
                    :inactive-text="`${portOpenPct(portA)}%`"
                    @change="(val) => onPortSwitch(portA, val)"
                  />
                  <span class="control-device__switch-badge">
                    {{ portLabel(portA, 'A') }}
                  </span>
                </div>
              </div>

              <div
                class="control-device__bottom-item control-device__switch-compact control-device__opening-compact"
                :class="{ 'is-offline-disabled': !isOnline }"
                @click="onEditOpening"
              >
                <span class="control-device__switch-compact-label">默认开度</span>
                <div class="control-device__opening-compact-right">
                  <span class="control-device__opening-pct">
                    {{ defaultOpenPct(portA) }}%
                  </span>
                  <img
                    class="control-device__opening-icon"
                    :src="defaultOpenIcon"
                    alt=""
                  />
                  <span class="control-device__opening-pct">
                    {{ defaultOpenPct(portB) }}%
                  </span>
                </div>
              </div>

              <div
                v-if="portB"
                class="control-device__bottom-item control-device__switch-compact"
                :class="portSwitchClass(portB)"
              >
                <span class="control-device__switch-compact-label">
                  出水口 {{ portLabel(portB, 'B') }}
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
                    :inactive-text="`${portOpenPct(portB)}%`"
                    @change="(val) => onPortSwitch(portB, val)"
                  />
                  <span class="control-device__switch-badge">
                    {{ portLabel(portB, 'B') }}
                  </span>
                </div>
              </div>
            </div>
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
                  v-if="isRunning"
                  class="control-device__run-disc"
                  :class="{ 'is-rotate': isRunning }"
                  :src="runningDiscImg"
                  alt=""
                />
                <div v-else class="control-device__run-ring-static"></div>
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
                <template v-else-if="isManualMode">
                  <div class="control-device__stat">
                    <span class="control-device__stat-label">运行时长</span>
                    <span class="control-device__stat-value is-empty">—</span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="control-device__nav-row">
            <button
              type="button"
              class="control-device__nav-card card"
              @click="onRecord"
            >
              <span class="control-device__nav-icon-wrap">
                <img
                  class="control-device__nav-icon"
                  :src="navRecordIcon"
                  alt=""
                />
              </span>
              <span>记录</span>
            </button>
            <button
              type="button"
              class="control-device__nav-card card"
              @click="onTimerControl"
            >
              <span class="control-device__nav-icon-wrap">
                <img
                  class="control-device__nav-icon"
                  :src="navTimerIcon"
                  alt=""
                />
              </span>
              <span>定时控制</span>
            </button>
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
import defaultOpenIcon from '@/assets/map/ic_kd.png'
import runningDiscImg from '@/assets/device/device_img_running.png'
import navRecordIcon from '@/assets/device/nav-record-icon.svg'
import navTimerIcon from '@/assets/device/nav-timer-icon.svg'

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

/** 胶囊区电量展示：仅百分比 */
const batteryDisplayText = computed(() => `${batteryPercent.value}%`)

const snrText = computed(() => {
  const snr = statusInfo.value?.snr
  if (snr == null || snr === '') return ''
  return `(${snr})`
})

/** 信号功率值展示（不含「信号良好」等文案） */
const signalPowerText = computed(() => {
  const signal = statusInfo.value?.signal
  if (signal == null) return '--'
  const suffix = snrText.value ? snrText.value : ''
  return `${signal}dBm${suffix}`
})

const syncTimeText = computed(() =>
  formatSyncTime(statusInfo.value?.updateTimeUtc)
)

const deviceCodeText = computed(
  () => statusInfo.value?.deviceCode || deviceInfo.value?.deviceCode || '--'
)

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
  return true
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
  } else if (isManualMode.value) {
    return { icon: 'icon-device_ic_manual', label: '手动' }
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
  min-width: 0;
  flex: 1;
}

.control-device__header-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.control-device__header-sub {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.control-device__name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.control-device__back {
  /* 暂时隐藏返回，保留点击逻辑 */
  visibility: hidden;
  width: 0;
  height: 0;
  overflow: hidden;
  padding: 0;
  margin: 0;
  border: none;
  pointer-events: none;
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

.control-device__device-code {
  font-size: 14px;
  font-weight: 500;
  color: #909399;
  white-space: nowrap;
  flex-shrink: 0;
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

.control-device__edit-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #d0d7e8;
  border-radius: 16px;
  background: #fff;
  color: #3653a0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.control-device__edit-inline .iconfont {
  font-size: 14px;
}

.control-device__edit-inline:hover {
  background: #f5f7fb;
}

.control-device__header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.control-device__map-btn {
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 20px;
  background: #3653a0;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: none;
  outline: none;
}

.control-device__map-btn:hover {
  background: #2f4a90;
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
  min-width: 0;
  min-height: 0;
}

.control-device__viz {
  position: relative;
  padding: 20px;
  min-height: 520px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.control-device__viz-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.control-device__sync-bar {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.control-device__sync-time {
  font-family: Inter, 'Inter', sans-serif;
  font-size: 16px;
  font-weight: normal;
  line-height: 15px;
  letter-spacing: 0px;
  color: #9ca3af;
}

.control-device__sync-time-value {
  font: inherit;
  font-style: italic;
  color: inherit;
  font-synthesis: style;
}

.control-device__sync-link {
  box-sizing: border-box;
  background: rgba(54, 83, 160, 0.05);
  border: 1px solid rgba(54, 83, 160, 0.2);
  border-radius: 20px;
  padding: 6px 16px;
  color: #3653a0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.4;
}

.control-device__sync-link:hover {
  background: rgba(54, 83, 160, 0.1);
  border-color: rgba(54, 83, 160, 0.35);
}

.control-device__metrics-capsule {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 8px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1.33px 2.66px 0 rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
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

.control-device__metric--battery {
  gap: 6px;
  color: #00c970;
}

.control-device__metric--battery .iconfont {
  font-size: 18px;
  color: inherit;
  transform: rotate(90deg);
  line-height: 1;
}

.control-device__metric--battery.is-low {
  color: #f56c6c;
}

.control-device__device-wrap {
  position: relative;
  margin-top: 12px;
  flex: 1;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  /* 为设备图上移预留空间，避免顶部被裁切出现横线 */
  padding-top: 95px;
  box-sizing: border-box;
}

.control-device__device-img {
  width: 320px;
  height: 360px;
  object-fit: contain;
  position: relative;
  top: -95px;
}

.control-device__port-overlay {
  position: absolute;
  top: calc(18% + 70px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 2;
  box-sizing: border-box;
}

.control-device__port-overlay.is-a {
  left: 6%;
}

.control-device__port-overlay.is-b {
  right: 6%;
}

/* 出水口名称圆标：48×48 */
.control-device__port-marker {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  opacity: 1;
  background: rgba(255, 255, 255, 0.002);
  border: 3px solid #ffffff;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.control-device__port-overlay.is-on .control-device__port-marker {
  background: #3653a0;
  color: #fff;
}

.control-device__port-overlay.is-off .control-device__port-marker {
  background: rgba(241, 245, 249, 0.95);
  color: rgba(68, 70, 81, 0.4);
}

/* 压力数值区域：180×80（图2 红框 1、2） */
.control-device__pressure {
  width: 180px;
  height: 80px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 40px;
  background: rgba(241, 245, 249, 0.95);
  box-sizing: border-box;
  padding: 0 20px;
}

.control-device__port-overlay.is-on .control-device__pressure {
  color: #3653a0;
}

.control-device__port-overlay.is-off .control-device__pressure {
  color: rgba(68, 70, 81, 0.3);
}

.control-device__pressure-val {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  color: inherit;
}

.control-device__pressure-units {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.2;
}

.control-device__pressure-units em {
  font-style: normal;
  font-size: 14px;
  font-weight: 600;
  color: inherit;
}

.control-device__flow em {
  font-style: normal;
  font-size: 12px;
  font-weight: 500;
  color: #909399;
}

.control-device__flow {
  position: absolute;
  bottom: 54px;
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

.control-device__bottom-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
  padding-top: 0;
  flex-shrink: 0;
}

.control-device__bottom-item {
  min-width: 0;
  height: 97px;
  min-height: 97px;
  padding: 12px 16px;
  border-radius: 20px;
  opacity: 1;
  background: #ffffff;
  box-sizing: border-box;
  border: 1px solid rgba(224, 227, 230, 0.3);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.control-device__switch-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.control-device__opening-compact:hover {
  background: #ffffff;
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.08);
}

.control-device__switch-compact-label {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
  white-space: nowrap;
}

.control-device__opening-compact {
  cursor: pointer;
}

.control-device__opening-compact.is-offline-disabled {
  cursor: not-allowed;
  pointer-events: none;
}

.control-device__opening-compact-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.control-device__opening-pct {
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: bold;
  line-height: normal;
  letter-spacing: 0px;
  color: #969799;
}

.control-device__opening-compact-right .control-device__opening-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
  display: block;
}

.control-device__nav-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}

.control-device__nav-card {
  height: 98px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 22px;
  padding: 0 20px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  box-sizing: border-box;
}

.control-device__nav-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: #f1f4f7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.control-device__nav-icon {
  width: 20px;
  height: 20px;
  display: block;
  object-fit: contain;
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
  padding: 20px 20px 24px;
  flex: 1;
  min-height: 294px;
  display: flex;
  flex-direction: column;
}

.control-device__status-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

.control-device__status-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 24px;
}

.control-device__run-ring {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.control-device__run-ring-static {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 6px solid #00c970;
  box-sizing: border-box;
  opacity: 0.85;
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

.control-device__stat-value.is-empty {
  color: #3653a0;
  font-size: 32px;
  line-height: 1;
}

.control-device__switch-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
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
.control-device__switch-card.is-closed .control-device__switch-badge,
.control-device__switch-compact.is-open .control-device__switch-badge,
.control-device__switch-compact.is-closed .control-device__switch-badge {
  left: 3px;
}

.control-device__switch-card.is-open .control-device__switch-wrap :deep(.el-switch__core),
.control-device__switch-compact.is-open .control-device__switch-wrap :deep(.el-switch__core) {
  padding-left: 36px;
}

.control-device__switch-card.is-closed .control-device__switch-wrap :deep(.el-switch__core),
.control-device__switch-compact.is-closed .control-device__switch-wrap :deep(.el-switch__core) {
  padding-left: 36px;
}

.control-device__switch-card.is-muted .control-device__switch-badge,
.control-device__switch-compact.is-muted .control-device__switch-badge {
  background: #f5f6f8;
  color: #a8abb2;
}

.control-device__bottom-row.is-valve-busy .is-blink :deep(.el-switch__core) {
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

.control-device.is-offline .control-device__viz,
.control-device.is-offline .control-device__bottom-row,
.control-device.is-offline .control-device__opening-compact {
  opacity: 0.72;
}

@media (max-width: 1100px) {
  .control-device__main {
    grid-template-columns: 1fr;
  }
}
</style>
