<template>
  <div
    v-if="visible"
    class="fertilizer-popup"
    @click.stop
    @mousedown.stop
  >
    <div v-if="loading && !statusReady" class="fertilizer-popup__loading">
      加载中...
    </div>

    <template v-else>
      <div class="fertilizer-popup__header">
        <div class="fertilizer-popup__title-row">
          <h3 class="fertilizer-popup__title">{{ displayName }}</h3>
          <button type="button" class="fertilizer-popup__link" @click="onViewDetail">
            查看详情 &gt;
          </button>
        </div>
      </div>

      <div
        class="fertilizer-popup__body"
        :class="{ 'is-offline': !deviceOperable }"
      >
        <div class="fertilizer-popup__hero">
          <img class="fertilizer-popup__hero-img" :src="heroImage" alt="" />
        </div>

        <div class="fertilizer-popup__card">
          <div class="fertilizer-popup__metrics">
            <div
              v-for="(item, index) in metricList"
              :key="item.label"
              class="fertilizer-popup__metric"
            >
              <div class="fertilizer-popup__metric-value">{{ item.value }}</div>
              <div class="fertilizer-popup__metric-label">{{ item.label }}</div>
              <span
                v-if="index < metricList.length - 1"
                class="fertilizer-popup__metric-divider"
                aria-hidden="true"
              ></span>
            </div>
          </div>

          <div class="fertilizer-popup__progress">
            <div class="fertilizer-popup__progress-head">
              <span class="fertilizer-popup__progress-label">
                {{ progressInfo.label }}
              </span>
              <span class="fertilizer-popup__progress-remain">
                {{ progressInfo.remainText }}
              </span>
            </div>
            <div class="fertilizer-popup__progress-track">
              <div
                class="fertilizer-popup__progress-fill"
                :class="{ 'is-empty': progressInfo.percent <= 0 }"
                :style="{ width: `${progressInfo.percent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div class="fertilizer-popup__actions">
          <button
            v-for="action in actionList"
            :key="action.key"
            type="button"
            class="fertilizer-popup__action-btn"
            :class="{
              'is-stop': action.running,
              'is-disabled': action.disabled
            }"
            :disabled="action.disabled"
            @click="onToggleAction(action.key)"
          >
            <img
              class="fertilizer-popup__action-icon"
              :src="action.icon"
              alt=""
            />
            <span>{{ action.label }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * 地图施肥机控制弹窗
 * 布局对齐出水桩弹窗左上角卡片；业务对齐移动端 pop_fertilizer_control
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fismartRrpc } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import heroImage from '@/assets/device/fertilizer/fertilizer_machine_hero.png'
import iconManualFertilizer from '@/assets/device/fertilizer/icon_manual_fertilizer.png'
import iconStopFertilizer from '@/assets/device/fertilizer/icon_stop_fertilizer.png'
import iconManualIrrigate from '@/assets/device/fertilizer/icon_stop_irrigate.png'
import iconManualMix from '@/assets/device/fertilizer/icon_stop_mix.png'

const POLL_MS = 3000
const MIX_LOCK_MS = 10000
const ACTION_LOCK_MS = 10000

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 地图上点击的施肥机设备（至少含 id） */
  device: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'close'])

const router = useRouter()
const farmStore = useFarmStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const loading = ref(false)
const statusReady = ref(false)
const deviceInfo = ref(null)
const rrpcData = ref(null)
const valveRrpcData = ref(null)
const valveProgramName = ref('')
const controlValveActionCache = ref(null)
const controlMixActionCache = ref(null)
const isLockAction = ref(false)

let pollTimer = null
let requestSeq = 0
let lockActionTimer = null
let mixLockUntil = 0
let lockMixActionTimer = null

const displayName = computed(
  () => deviceInfo.value?.name || props.device?.name || '施肥机'
)

function formatWithUnit(val, unit) {
  if (val === null || val === undefined || val === '') return '--'
  return `${val}${unit}`
}

function textOrDash(val) {
  if (val === null || val === undefined || val === '') return '--'
  return String(val)
}

function clampPercent(val) {
  const num = Number(val)
  if (!Number.isFinite(num) || num < 0) return 0
  if (num > 100) return 100
  return num
}

function extractStatusTime(statusStr) {
  const str = String(statusStr || '')
  const matches = str.match(/\d{1,2}:\d{2}:\d{2}/g)
  if (matches?.length) return matches[matches.length - 1]
  return ''
}

function getRemainLabel(statusStr) {
  const str = String(statusStr || '')
  if (str.includes('正在运行')) return '剩余时间(时/分/秒)'
  if (str.includes('正在停止')) return '延迟时间(时/分/秒)'
  return '下次启动时间'
}

function getRemainText(statusStr, nextRunTime) {
  const str = String(statusStr || '')
  if (str.includes('正在运行') || str.includes('正在停止')) {
    return extractStatusTime(str) || '--'
  }
  if (str.includes('未运行')) return textOrDash(nextRunTime)
  return textOrDash(nextRunTime)
}

const metricList = computed(() => {
  const payload = rrpcData.value || {}
  const fert = payload.fertStatus || {}
  const source = payload.Data?.Source || {}
  const host = payload.Data?.Host || {}
  return [
    { label: '主管流量', value: formatWithUnit(fert.mainFlow, 'm³/h') },
    { label: '肥流量', value: formatWithUnit(fert.fertFlow, 'm³/h') },
    { label: '液位', value: formatWithUnit(source.CL, 'cm') },
    { label: '压力', value: formatWithUnit(host.PS, 'mpa') }
  ]
})

const progressInfo = computed(() => {
  const fert = rrpcData.value?.fertStatus || {}
  const statusStr = fert.runingStatusString
  return {
    label: getRemainLabel(statusStr),
    remainText: getRemainText(statusStr, fert.nextRunTime),
    percent: clampPercent(fert.progressBar)
  }
})

const deviceOperable = computed(() => {
  if (!deviceInfo.value || !statusReady.value) return false
  const online = deviceInfo.value.isOnline
  if (online === false || online === 0 || online === '0') return false
  return true
})

function isMachineStopping(payload) {
  const statusStr = payload?.fertStatus?.runingStatusString || ''
  return String(statusStr).includes('正在停止')
}

function isFertilizeRunningFromStatus(payload) {
  if (!payload) return false
  const programs = payload.Data?.Program
  return Array.isArray(programs) && programs.length > 0
}

function isIrrigateRunningFromStatus(payload) {
  if (!payload) return false
  const programs = payload.Data?.Program
  if (Array.isArray(programs) && programs.length > 0) return false
  return Number(payload.Data?.Host?.SP) === 1
}

function isMixRunningFromStatus(payload) {
  if (!payload) return null
  const stirl = payload.Data?.Host?.STIRL
  if (!stirl || stirl.length < 2) return null
  const val = Number(stirl[1])
  if (val === 1) return true
  if (val === 0) return false
  return null
}

function isMixActionLocked() {
  return Date.now() < mixLockUntil
}

const fertilizeRunning = computed(() => {
  const cache = controlValveActionCache.value
  if (cache && cache.mode === 'fertilize' && (cache.pending || cache.userConfirmed)) {
    return true
  }
  return (
    isFertilizeRunningFromStatus(rrpcData.value) ||
    isMachineStopping(rrpcData.value)
  )
})

const irrigateRunning = computed(() => {
  const cache = controlValveActionCache.value
  if (cache && cache.mode === 'irrigate' && (cache.pending || cache.userConfirmed)) {
    return true
  }
  return isIrrigateRunningFromStatus(rrpcData.value)
})

const mixRunning = computed(() => {
  const cache = controlMixActionCache.value
  if (cache && (cache.userAction || isMixActionLocked())) {
    return !!cache.active
  }
  const fromStatus = isMixRunningFromStatus(rrpcData.value)
  if (fromStatus !== null) return fromStatus === true
  return false
})

const canToggleFertilize = computed(() => {
  if (!deviceOperable.value) return false
  if (isMachineStopping(rrpcData.value)) return false
  if (fertilizeRunning.value) return true
  if (irrigateRunning.value) return false
  if (isLockAction.value) return false
  return true
})

const canToggleIrrigate = computed(() => {
  if (!deviceOperable.value) return false
  if (isMachineStopping(rrpcData.value)) return false
  if (irrigateRunning.value) return true
  if (fertilizeRunning.value) return false
  if (isLockAction.value) return false
  return true
})

const canToggleMix = computed(() => {
  if (!deviceOperable.value) return false
  const cache = controlMixActionCache.value
  if (cache && (cache.userAction === 'starting' || cache.userAction === 'stopping')) {
    return false
  }
  if (isMixActionLocked()) return false
  return true
})

const actionList = computed(() => [
  {
    key: 'fertilize',
    label: fertilizeRunning.value ? '停止施肥' : '手动施肥',
    icon: fertilizeRunning.value ? iconStopFertilizer : iconManualFertilizer,
    running: fertilizeRunning.value,
    disabled: !canToggleFertilize.value && !fertilizeRunning.value
  },
  {
    key: 'irrigate',
    label: irrigateRunning.value ? '停止灌溉' : '手动灌溉',
    icon: iconManualIrrigate,
    running: irrigateRunning.value,
    disabled: !canToggleIrrigate.value && !irrigateRunning.value
  },
  {
    key: 'mix',
    label: mixRunning.value ? '停止搅拌' : '手动搅拌',
    icon: iconManualMix,
    running: mixRunning.value,
    disabled: !canToggleMix.value
  }
])

const deviceId = computed(
  () => deviceInfo.value?.id ?? props.device?.id ?? null
)

function setValveActionCache(mode, pending = true, userConfirmed = false) {
  controlValveActionCache.value = {
    mode,
    pending: !!pending,
    userConfirmed: !!userConfirmed
  }
}

function confirmValveActionCache(mode) {
  controlValveActionCache.value = {
    mode,
    pending: false,
    userConfirmed: true
  }
}

function clearValveActionCache() {
  controlValveActionCache.value = null
}

function setMixUserAction(active, userAction) {
  controlMixActionCache.value = {
    active: !!active,
    userAction: userAction || null
  }
}

function clearMixActionCache() {
  controlMixActionCache.value = null
}

function clearLockActionTimer() {
  if (lockActionTimer) {
    clearTimeout(lockActionTimer)
    lockActionTimer = null
  }
}

function lockActionBriefly() {
  isLockAction.value = true
  clearLockActionTimer()
  lockActionTimer = setTimeout(() => {
    isLockAction.value = false
    lockActionTimer = null
  }, ACTION_LOCK_MS)
}

function clearMixLockTimer() {
  if (lockMixActionTimer) {
    clearTimeout(lockMixActionTimer)
    lockMixActionTimer = null
  }
}

function lockMixActionBriefly() {
  mixLockUntil = Date.now() + MIX_LOCK_MS
  clearMixLockTimer()
  lockMixActionTimer = setTimeout(() => {
    mixLockUntil = 0
    lockMixActionTimer = null
  }, MIX_LOCK_MS)
}

function syncValveActionState(payload) {
  if (!payload) return
  const fertilizing = isFertilizeRunningFromStatus(payload)
  const irrigating = isIrrigateRunningFromStatus(payload)
  const stopping = isMachineStopping(payload)
  const cache = controlValveActionCache.value

  if (cache?.pending) {
    if (cache.mode === 'fertilize' && fertilizing) {
      confirmValveActionCache('fertilize')
    } else if (cache.mode === 'irrigate' && irrigating) {
      confirmValveActionCache('irrigate')
    } else if (cache.mode === 'irrigate' && !irrigating && !fertilizing) {
      clearValveActionCache()
    }
    return
  }

  if (cache?.userConfirmed) {
    if (cache.mode === 'fertilize' && (fertilizing || stopping)) {
      controlValveActionCache.value = { mode: 'fertilize', pending: false }
      return
    }
    if (cache.mode === 'irrigate' && irrigating) {
      controlValveActionCache.value = { mode: 'irrigate', pending: false }
      return
    }
    if (!fertilizing && !irrigating && !stopping) clearValveActionCache()
    return
  }

  if (fertilizing || stopping) {
    controlValveActionCache.value = { mode: 'fertilize', pending: false }
  } else if (irrigating) {
    controlValveActionCache.value = { mode: 'irrigate', pending: false }
  } else {
    clearValveActionCache()
  }
}

function syncMixActionState(payload) {
  if (!payload) return
  const cache = controlMixActionCache.value
  if (cache && (cache.userAction === 'starting' || cache.userAction === 'stopping')) {
    return
  }
  if (isMixActionLocked()) return
  const fromStatus = isMixRunningFromStatus(payload)
  if (fromStatus === null) return
  controlMixActionCache.value = {
    active: fromStatus === true,
    userAction: null
  }
}

function syncValveProgramName() {
  const pnl = valveRrpcData.value?.Data?.ValveStaus?.PNL
  if (pnl?.length && pnl[0] != null && pnl[0] !== '') {
    valveProgramName.value = String(pnl[0])
  }
}

function getDurationSeconds() {
  const sec = Number(rrpcData.value?.fertParam?.fertRunTime)
  return Number.isFinite(sec) ? sec : 0
}

async function loadFertilizerStatus({ showLoading = false } = {}) {
  const id = deviceId.value
  if (id == null || id === '') {
    statusReady.value = true
    return
  }
  const seq = ++requestSeq
  if (showLoading) loading.value = true
  try {
    const res = await fismartRrpc(
      id,
      { MsgType: 'getStatusTopic', Code: 0, Data: 'Sys,Alarm,Sensor' },
      { silent: !showLoading, loading: false }
    )
    if (seq !== requestSeq) return
    rrpcData.value = res?.data || null
    syncValveActionState(rrpcData.value)
    syncMixActionState(rrpcData.value)
    if (deviceInfo.value && rrpcData.value) {
      if (rrpcData.value.name) deviceInfo.value.name = rrpcData.value.name
      if (rrpcData.value.isOnline != null) {
        deviceInfo.value.isOnline = rrpcData.value.isOnline
      }
    }
  } catch (e) {
    if (seq !== requestSeq) return
    console.error('[FertilizerPopup] getStatusTopic 失败', e)
    if (!rrpcData.value) {
      ElMessage.error(e?.message || e?.msg || '获取施肥机状态失败')
    }
  } finally {
    if (seq === requestSeq) {
      statusReady.value = true
      loading.value = false
    }
  }
}

async function loadFertilizerValve() {
  const id = deviceId.value
  if (id == null || id === '') return
  try {
    const res = await fismartRrpc(
      id,
      { MsgType: 'getRuningValveTopic' },
      { silent: true }
    )
    valveRrpcData.value = res?.data || null
    syncValveProgramName()
  } catch (e) {
    console.error('[FertilizerPopup] getRuningValveTopic 失败', e)
  }
}

async function refreshFertilizer({ showLoading = false } = {}) {
  await Promise.all([
    loadFertilizerStatus({ showLoading }),
    loadFertilizerValve()
  ])
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
    refreshFertilizer({ showLoading: false })
  }, POLL_MS)
}

function resetState() {
  rrpcData.value = null
  valveRrpcData.value = null
  valveProgramName.value = ''
  statusReady.value = false
  loading.value = false
  controlValveActionCache.value = null
  controlMixActionCache.value = null
  isLockAction.value = false
  mixLockUntil = 0
  clearLockActionTimer()
  clearMixLockTimer()
}

async function openWithDevice() {
  resetState()
  clearPoll()
  requestSeq += 1

  const device = props.device
  if (!device?.id) {
    ElMessage.warning('缺少设备信息')
    return
  }

  deviceInfo.value = { ...device }
  farmStore.setControlDevice?.(deviceInfo.value)

  await loadFertilizerValve()
  await loadFertilizerStatus({ showLoading: true })
  startPoll()
}

function closePopup() {
  clearPoll()
  resetState()
  deviceInfo.value = null
  visible.value = false
  emit('close')
}

/** 对齐移动端 toDetail → control_fertilizer */
function onViewDetail() {
  const device = deviceInfo.value || props.device
  if (!device?.id) {
    ElMessage.warning('缺少设备信息')
    return
  }
  farmStore.setControlDevice({ ...device })
  closePopup()
  router.push({
    path: '/device/control-fertilizer',
    query: { id: String(device.id) }
  })
}

function onToggleAction(key) {
  if (key === 'fertilize') {
    if (!canToggleFertilize.value) return
    if (fertilizeRunning.value) {
      runStopValveTopicHttp()
      return
    }
    runManualFertilizeHttp()
    return
  }
  if (key === 'irrigate') {
    if (!canToggleIrrigate.value) return
    if (irrigateRunning.value) {
      runStopIrrigateHttp()
      return
    }
    runManualIrrigateHttp()
    return
  }
  if (key === 'mix') {
    if (!canToggleMix.value) return
    if (mixRunning.value) runStopMixHttp()
    else runManualMixHttp()
  }
}

async function runManualFertilizeHttp() {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('设备信息缺失')
    return
  }
  const body = {
    MsgType: 'runValveTopic',
    Code: 1,
    Data: {
      Model: 1,
      FID: 0,
      ValveList: [{ ID: 'VL0-8', Time: getDurationSeconds() }]
    }
  }
  setValveActionCache('fertilize')
  lockActionBriefly()
  try {
    await fismartRrpc(id, body, { silent: false, loading: true })
    confirmValveActionCache('fertilize')
    await refreshFertilizer({ showLoading: false })
  } catch (e) {
    clearValveActionCache()
    console.error('[FertilizerPopup] runValveTopic 失败', e)
  }
}

async function runStopValveTopicHttp() {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('设备信息缺失')
    return
  }
  if (!valveProgramName.value) {
    ElMessage.warning('阀门程序信息缺失')
    return
  }
  const body = {
    MsgType: 'stopValveTopic',
    Code: 0,
    Data: [{ VN: 'VL0-8', PN: valveProgramName.value }]
  }
  try {
    await fismartRrpc(id, body, { silent: false, loading: true })
    clearValveActionCache()
    await refreshFertilizer({ showLoading: false })
  } catch (e) {
    console.error('[FertilizerPopup] stopValveTopic 失败', e)
  }
}

async function runIrrigatePumpTopicHttp(cmd) {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('设备信息缺失')
    return
  }
  const body = {
    MsgType: 'setStirPumpTopic',
    Data: { Ch: 100, Cmd: cmd }
  }
  try {
    await fismartRrpc(id, body, { silent: false, loading: true })
    if (cmd === 1) confirmValveActionCache('irrigate')
    else clearValveActionCache()
    await refreshFertilizer({ showLoading: false })
  } catch (e) {
    if (cmd === 1) clearValveActionCache()
    console.error('[FertilizerPopup] setStirPumpTopic(灌溉) 失败', e)
  }
}

function runManualIrrigateHttp() {
  setValveActionCache('irrigate')
  lockActionBriefly()
  runIrrigatePumpTopicHttp(1)
}

function runStopIrrigateHttp() {
  lockActionBriefly()
  runIrrigatePumpTopicHttp(0)
}

async function runStirPumpTopicHttp(cmd) {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('设备信息缺失')
    return
  }
  const body = {
    MsgType: 'setStirPumpTopic',
    Data: { Ch: 1, Cmd: cmd }
  }
  try {
    await fismartRrpc(id, body, { silent: false, loading: true })
    setMixUserAction(cmd === 1, cmd === 1 ? 'started' : 'stopped')
    lockMixActionBriefly()
    await refreshFertilizer({ showLoading: false })
  } catch (e) {
    clearMixActionCache()
    console.error('[FertilizerPopup] setStirPumpTopic(搅拌) 失败', e)
  }
}

function runManualMixHttp() {
  setMixUserAction(true, 'starting')
  runStirPumpTopicHttp(1)
}

function runStopMixHttp() {
  setMixUserAction(false, 'stopping')
  runStirPumpTopicHttp(0)
}

/** 农场侧 isOnline 等增量合并（对齐出水桩 mergeFromFarmDevice） */
function mergeFromFarmDevice(live) {
  if (!live || !deviceInfo.value) return
  if (String(live.id) !== String(deviceInfo.value.id)) return
  if (live.isOnline != null) deviceInfo.value.isOnline = live.isOnline
  if (live.batteryPercent != null) {
    deviceInfo.value.batteryPercent = live.batteryPercent
  }
  if (live.name) deviceInfo.value.name = live.name
  if (live.specificData) {
    deviceInfo.value.specificData = {
      ...(deviceInfo.value.specificData || {}),
      ...live.specificData
    }
  }
}

watch(
  () => [props.modelValue, props.device?.id],
  ([show, id]) => {
    if (show && id != null) {
      openWithDevice()
    } else {
      clearPoll()
      if (!show) resetState()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  clearPoll()
  clearLockActionTimer()
  clearMixLockTimer()
})

defineExpose({
  closePopup,
  mergeFromFarmDevice,
  refreshFertilizer
})
</script>

<style scoped>
.fertilizer-popup {
  position: absolute;
  top: 16px;
  left: 26px;
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

.fertilizer-popup__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.fertilizer-popup__header {
  flex-shrink: 0;
}

.fertilizer-popup__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fertilizer-popup__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fertilizer-popup__link {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.fertilizer-popup__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  overflow: hidden;
}

.fertilizer-popup__body.is-offline {
  opacity: 0.72;
}

.fertilizer-popup__hero {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  margin-top: 12px;
}

.fertilizer-popup__hero-img {
  max-width: 210px;
  max-height: 180px;
  width: 210px;
  object-fit: contain;
  display: block;
  user-select: none;
  pointer-events: none;
}

.fertilizer-popup__card {
  flex-shrink: 0;
  /* 图片缩小后可安全贴底，按钮不再被顶出 */
  margin-top: auto;
  background: #fff;
  border-radius: 12px;
  padding: 12px 10px 14px;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.06);
}

.fertilizer-popup__metrics {
  display: flex;
  align-items: stretch;
  margin-bottom: 12px;
}

.fertilizer-popup__metric {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.fertilizer-popup__metric-value {
  font-size: 13px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
  white-space: nowrap;
}

.fertilizer-popup__metric-label {
  font-size: 11px;
  color: #909399;
  line-height: 1.2;
}

.fertilizer-popup__metric-divider {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 28px;
  background: #ebeef5;
}

.fertilizer-popup__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.fertilizer-popup__progress-label {
  font-size: 12px;
  color: #909399;
}

.fertilizer-popup__progress-remain {
  font-size: 12px;
  color: #303133;
  font-weight: 600;
}

.fertilizer-popup__progress-track {
  height: 8px;
  border-radius: 999px;
  background: #eef1f6;
  overflow: hidden;
}

.fertilizer-popup__progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #5b8def, #3653a0);
  transition: width 0.25s ease;
}

.fertilizer-popup__progress-fill.is-empty {
  width: 0 !important;
  background: transparent;
}

.fertilizer-popup__actions {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  background: #fff;
  border-radius: 12px;
  padding: 12px 10px;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.06);
}

.fertilizer-popup__action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 72px;
  padding: 8px 4px;
  border: none;
  border-radius: 10px;
  background: #3bb273;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
}

.fertilizer-popup__action-btn.is-stop {
  background: #e35d5d;
}

.fertilizer-popup__action-btn.is-disabled,
.fertilizer-popup__action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.fertilizer-popup__action-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
}
</style>
