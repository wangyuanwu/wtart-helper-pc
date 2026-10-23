<template>
  <div class="control-fertilizer">
    <header class="control-fertilizer__head">
      <div class="control-fertilizer__head-left">
        <button type="button" class="control-fertilizer__back" @click="onBack">
          ← 返回
        </button>
        <h1 class="control-fertilizer__title">{{ displayName }}</h1>
      </div>
      <el-button type="primary" class="control-fertilizer__edit" @click="onEdit">
        <i class="iconfont icon-a-device_ic_edit1"></i>
        编辑施肥机
      </el-button>
    </header>

    <div v-if="!statusReady" class="control-fertilizer__loading">加载中...</div>

    <div v-else class="control-fertilizer__body">
      <!-- 左侧：设备状态卡片 -->
      <section class="control-fertilizer__status-card">
        <div class="control-fertilizer__hero">
          <img
            class="control-fertilizer__hero-img"
            :src="heroImage"
            alt=""
          />
          <button
            type="button"
            class="control-fertilizer__timer-btn"
            title="定时"
            @click="onTimer"
          >
            <img :src="timerIcon" alt="" />
          </button>
        </div>

        <div class="control-fertilizer__metrics">
          <div
            v-for="(item, index) in metricList"
            :key="item.label"
            class="control-fertilizer__metric"
          >
            <div class="control-fertilizer__metric-value">{{ item.value }}</div>
            <div class="control-fertilizer__metric-label">{{ item.label }}</div>
            <span
              v-if="index < metricList.length - 1"
              class="control-fertilizer__metric-divider"
              aria-hidden="true"
            ></span>
          </div>
        </div>

        <div class="control-fertilizer__progress-block">
          <div class="control-fertilizer__progress-head">
            <span class="control-fertilizer__progress-label">
              {{ progressInfo.label }}
            </span>
            <span class="control-fertilizer__progress-remain">
              {{ progressInfo.remainText }}
            </span>
          </div>
          <div class="control-fertilizer__progress-track">
            <div
              class="control-fertilizer__progress-fill"
              :class="{ 'is-empty': progressInfo.percent <= 0 }"
              :style="{ width: `${progressInfo.percent}%` }"
            ></div>
          </div>
        </div>
      </section>

      <!-- 右侧：控制面板卡片 -->
      <section class="control-fertilizer__panel-card">
        <div class="control-fertilizer__tabs">
          <button
            v-for="(tab, index) in modeTabs"
            :key="tab"
            type="button"
            class="control-fertilizer__tab"
            :class="{
              'is-active': activeModeIndex === index,
              'is-locked': fertilizeRunning
            }"
            @click="onModeTabClick(index)"
          >
            {{ tab }}
          </button>
        </div>

        <div class="control-fertilizer__slider-area">
          <div class="control-fertilizer__slider-row">
            <div
              v-for="item in sliderList"
              :key="`${activeModeIndex}-${item.key}`"
              class="control-fertilizer__slider-col"
            >
              <div class="control-fertilizer__slider-top">{{ item.maxText }}</div>
              <!-- 轨道本体：1600 宽下视觉 320px，其它分辨率随 rem 缩放；上下标签在外部 -->
              <div
                class="control-fertilizer__slider-wrap"
                :class="{ 'is-locked': fertilizeRunning }"
                :style="sliderTrackBoxStyle"
                :ref="(el) => setSliderTrackRef(item.key, el)"
                @pointerdown="onSliderPointerDown($event, item)"
              >
                <div class="control-fertilizer__slider-track">
                  <div
                    class="control-fertilizer__slider-fill"
                    :style="{ height: `${getSliderRatio(item) * 100}%` }"
                  ></div>
                  <div
                    class="control-fertilizer__slider-thumb"
                    :style="getSliderThumbStyle(item)"
                  >
                    {{ formatSliderThumb(item, getSliderDisplayValue(item)) }}
                  </div>
                </div>
              </div>
              <p class="control-fertilizer__slider-label">{{ item.label }}</p>
            </div>
          </div>
        </div>

        <div class="control-fertilizer__actions">
          <button
            v-for="action in actionList"
            :key="action.key"
            type="button"
            class="control-fertilizer__action-btn"
            :class="{
              'is-stop': action.running,
              'is-disabled': action.disabled
            }"
            :disabled="action.disabled"
            @click="onToggleAction(action.key)"
          >
            <img class="control-fertilizer__action-icon" :src="action.icon" alt="" />
            <span>{{ action.label }}</span>
          </button>
        </div>
      </section>
    </div>

    <FertilizerTimerListDialog
      v-model="timerListVisible"
      :device-id="deviceId"
      :device-info="deviceInfo"
    />
  </div>
</template>

<script setup>
/**
 * 施肥机控制页
 * 对齐移动端 control_fertilizer：状态轮询、modifyFertParamTopic、手动施肥/灌溉/搅拌 RRPC
 * 定时列表以弹窗展示（对齐移动端 fertilizer_timer_list 业务流程）
 */
import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import { fismartRrpc, getDeviceDetail, getFismartInfo } from '@/api/device'
import { px2rem } from '@/utils/rem'
import FertilizerTimerListDialog from './FertilizerTimerListDialog.vue'
import heroImage from '@/assets/device/fertilizer/fertilizer_machine_hero.png'
import timerIcon from '@/assets/device/fertilizer/icon_fert_timer.png'
import iconManualFertilizer from '@/assets/device/fertilizer/icon_manual_fertilizer.png'
import iconStopFertilizer from '@/assets/device/fertilizer/icon_stop_fertilizer.png'
import iconManualIrrigate from '@/assets/device/fertilizer/icon_stop_irrigate.png'
import iconManualMix from '@/assets/device/fertilizer/icon_stop_mix.png'

const POLL_MS = 5000
/** 对齐移动端 setStirPumpTopic 成功后 10s 锁定 */
const MIX_LOCK_MS = 10000
const BASE_VIEWPORT_WIDTH = 1600
const PXTORUM_ROOT = 192
const FLEXIBLE_DIVISOR = 10
const BASE_TRACK_WIDTH_PX = 66
const BASE_TRACK_HEIGHT_PX = 320
const BASE_THUMB_HEIGHT_PX = 34

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const modeTabs = ['固定流量', '固定总量', '固定比例']
const deviceInfo = ref(null)
const rrpcData = ref(null)
const valveRrpcData = ref(null)
const valveProgramName = ref('')
const statusReady = ref(false)
const activeModeIndex = ref(0)
const timerListVisible = ref(false)
const isSliderDragging = ref(false)
/** 对齐移动端 controlValveActionCache / controlMixActionCache */
const controlValveActionCache = ref(null)
const controlMixActionCache = ref(null)
const isLockAction = ref(false)

/** 对齐移动端 programSliderDraft；时长字段单位为秒 */
const sliderDraft = reactive({
  fertMode: 0,
  fertFlow: 0,
  fertVolum: 0,
  fertRatio: 0,
  fertRunTime: 0,
  fertSufTime: 0
})

let pollTimer = null
let lockActionTimer = null
let mixLockUntil = 0
let lockMixActionTimer = null
let offFarmChange = null
let requestSeq = 0

function visualPxAtBaseToRem(visualPx) {
  const designPx =
    (visualPx * PXTORUM_ROOT * FLEXIBLE_DIVISOR) / BASE_VIEWPORT_WIDTH
  return px2rem(designPx)
}

const sliderTrackWidthRem = visualPxAtBaseToRem(BASE_TRACK_WIDTH_PX)
const sliderTrackHeightRem = visualPxAtBaseToRem(BASE_TRACK_HEIGHT_PX)
const sliderThumbHeightRem = visualPxAtBaseToRem(BASE_THUMB_HEIGHT_PX)

const sliderTrackBoxStyle = {
  width: sliderTrackWidthRem,
  height: sliderTrackHeightRem,
  minHeight: sliderTrackHeightRem,
  flexShrink: '0',
  '--cf-thumb-h': sliderThumbHeightRem
}

const deviceId = computed(() => deviceInfo.value?.id ?? route.query.id ?? null)

const displayName = computed(() => {
  if (deviceInfo.value?.name) return deviceInfo.value.name
  if (farmStore.s_control_device?.name) return farmStore.s_control_device.name
  return '施肥机'
})

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
  if (str.includes('未运行')) return '下次启动时间'
  return '下次启动时间'
}

function getRemainText(statusStr, nextRunTime) {
  const str = String(statusStr || '')
  if (str.includes('正在运行') || str.includes('正在停止')) {
    return extractStatusTime(str) || '--'
  }
  if (str.includes('未运行')) return textOrDash(nextRunTime)
  return '--'
}

/** 对齐移动端 displayInfo / metricList */
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

function secondsToHours(sec) {
  const num = Number(sec)
  if (!Number.isFinite(num) || num <= 0) return 0
  return num / 3600
}

function formatHoursThumb(val) {
  const n = Number(val)
  if (!Number.isFinite(n) || n <= 0) return '0'
  // 施肥时长 / 延迟施肥：接口秒转小时后保留两位小数，如 10.13h
  return `${n.toFixed(2)}h`
}

function getSliderDisplayValue(item) {
  const raw = Number(sliderDraft[item.key]) || 0
  if (item.isHours) return secondsToHours(raw)
  return raw
}

function formatSliderThumb(item, displayVal) {
  if (typeof item.formatThumb === 'function') return item.formatThumb(displayVal)
  return String(displayVal ?? '')
}

function getSliderRatio(item) {
  const min = Number(item.min) || 0
  const max = Number(item.max) || 0
  const val = Number(getSliderDisplayValue(item))
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (val - min) / (max - min)))
}

function getSliderThumbStyle(item) {
  const ratio = getSliderRatio(item)
  return {
    bottom: `calc((100% - ${sliderThumbHeightRem}) * ${ratio})`
  }
}

function clampSliderValue(item, raw) {
  const min = Number(item.min) || 0
  const max = Number(item.max) || 0
  const step = Number(item.step) || 1
  const precision = String(step).includes('.')
    ? String(step).split('.')[1].length
    : 0
  const stepped = Math.round((raw - min) / step) * step + min
  const clamped = Math.min(max, Math.max(min, stepped))
  return Number(clamped.toFixed(precision))
}

const sliderTrackRefs = {}

function setSliderTrackRef(key, el) {
  if (el) sliderTrackRefs[key] = el
  else delete sliderTrackRefs[key]
}

function updateSliderFromClientY(item, clientY) {
  const el = sliderTrackRefs[item.key]
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.height <= 0) return
  const ratio = 1 - (clientY - rect.top) / rect.height
  const min = Number(item.min) || 0
  const max = Number(item.max) || 0
  const displayVal = clampSliderValue(item, min + ratio * (max - min))
  // 对齐移动端：时长类写入秒
  sliderDraft[item.key] = item.isHours
    ? Math.round(displayVal * 3600)
    : displayVal
}

let activeDragItem = null
let didSliderDrag = false

function onSliderPointerMove(e) {
  if (!activeDragItem) return
  didSliderDrag = true
  updateSliderFromClientY(activeDragItem, e.clientY)
}

function onSliderPointerUp() {
  const shouldSubmit = !!activeDragItem && didSliderDrag
  activeDragItem = null
  didSliderDrag = false
  isSliderDragging.value = false
  window.removeEventListener('pointermove', onSliderPointerMove)
  window.removeEventListener('pointerup', onSliderPointerUp)
  if (shouldSubmit) modifyFertParamTopicHttp()
}

function onSliderPointerDown(e, item) {
  if (fertilizeRunning.value) {
    showSliderAdjustBlockedTip()
    return
  }
  e.preventDefault()
  isSliderDragging.value = true
  didSliderDrag = true
  activeDragItem = item
  updateSliderFromClientY(item, e.clientY)
  window.addEventListener('pointermove', onSliderPointerMove)
  window.addEventListener('pointerup', onSliderPointerUp)
}

/** 对齐移动端时长条 precision=2（约 0.01h 步进） */
const durationSliderMeta = {
  key: 'fertRunTime',
  label: '施肥时长',
  maxText: '24h',
  min: 0,
  max: 24,
  step: 0.01,
  isHours: true,
  formatThumb: formatHoursThumb
}

const delaySliderMeta = {
  key: 'fertSufTime',
  label: '延迟施肥',
  maxText: '24h',
  min: 0,
  max: 24,
  step: 0.01,
  isHours: true,
  formatThumb: formatHoursThumb
}

/**
 * Tab 只换左侧条；中间施肥时长、右侧延迟施肥不变
 * - 固定流量：肥流量 15 m³/h
 * - 固定总量：灌溉总量 1000 m³
 * - 固定比例：肥水稀释倍数 1000 倍
 */
const sliderList = computed(() => {
  if (activeModeIndex.value === 0) {
    return [
      {
        key: 'fertFlow',
        label: '肥流量',
        maxText: '15m³/h',
        min: 0,
        max: 15,
        step: 0.1,
        formatThumb: (v) => `${Number(Number(v).toFixed(1))}m³/h`
      },
      durationSliderMeta,
      delaySliderMeta
    ]
  }
  if (activeModeIndex.value === 1) {
    return [
      {
        key: 'fertVolum',
        label: '灌溉总量',
        maxText: '1000m³',
        min: 0,
        max: 1000,
        step: 1,
        formatThumb: (v) => `${Math.round(Number(v))}m³`
      },
      durationSliderMeta,
      delaySliderMeta
    ]
  }
  return [
    {
      key: 'fertRatio',
      label: '肥水稀释倍数',
      maxText: '1000倍',
      min: 0,
      max: 1000,
      step: 1,
      formatThumb: (v) => `${Math.round(Number(v))}倍`
    },
    durationSliderMeta,
    delaySliderMeta
  ]
})

/** 仅 isOnline 明确为 false 时视为离线 */
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
  // 请求中 / setStirPumpTopic 成功后 10s 锁定期内，按本地操作目标展示
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
  // 请求中或 setStirPumpTopic 成功后 10s 锁定期内禁止再次操作
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

function isMixActionLocked() {
  return mixLockUntil > Date.now()
}

function clearMixActionLock() {
  if (lockMixActionTimer) {
    clearTimeout(lockMixActionTimer)
    lockMixActionTimer = null
  }
  mixLockUntil = 0
}

/** 对齐移动端 lockMixActionBriefly */
function lockMixActionBriefly() {
  clearMixActionLock()
  mixLockUntil = Date.now() + MIX_LOCK_MS
  lockMixActionTimer = setTimeout(() => {
    mixLockUntil = 0
    lockMixActionTimer = null
  }, MIX_LOCK_MS)
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
  }, 10000)
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

/** 轮询合并搅拌按钮态：请求中 / 操作成功后 10s 锁定期内不覆盖 */
function syncMixActionState(payload) {
  if (!payload) return
  const cache = controlMixActionCache.value
  // setStirPumpTopic 请求中，不被并发轮询覆盖
  if (cache && (cache.userAction === 'starting' || cache.userAction === 'stopping')) {
    return
  }
  // setStirPumpTopic 成功后 10s 内，不被 getStatusTopic 延迟数据覆盖
  if (isMixActionLocked()) return
  const fromStatus = isMixRunningFromStatus(payload)
  if (fromStatus === null) return
  controlMixActionCache.value = {
    active: fromStatus === true,
    userAction: null
  }
}

function syncProgramSliderDraft() {
  const fertParam = rrpcData.value?.fertParam || {}
  sliderDraft.fertMode = Number(fertParam.fertMode) || 0
  sliderDraft.fertFlow = Number(fertParam.fertFlow) || 0
  sliderDraft.fertVolum = Number(fertParam.fertVolum) || 0
  sliderDraft.fertRatio = Number(fertParam.fertRatio) || 0
  sliderDraft.fertRunTime = Number(fertParam.fertRunTime) || 0
  sliderDraft.fertSufTime = Number(fertParam.fertSufTime) || 0
  const mode = Number(sliderDraft.fertMode)
  activeModeIndex.value = mode === 1 || mode === 2 ? mode : 0
}

function syncValveProgramName() {
  const pnl = valveRrpcData.value?.Data?.ValveStaus?.PNL
  if (pnl?.length && pnl[0] != null && pnl[0] !== '') {
    valveProgramName.value = String(pnl[0])
  }
}

function getDurationSeconds() {
  const sec = Number(sliderDraft.fertRunTime)
  if (Number.isFinite(sec)) return sec
  return Number(rrpcData.value?.fertParam?.fertRunTime) || 0
}

function buildModifyFertParamPayload() {
  return {
    MsgType: 'modifyFertParamTopic',
    Data: {
      fertMode: Number(sliderDraft.fertMode) || 0,
      fertFlow: Number(sliderDraft.fertFlow) || 0,
      fertVolum: Number(sliderDraft.fertVolum) || 0,
      fertRatio: Number(sliderDraft.fertRatio) || 0,
      fertRunTime: Number(sliderDraft.fertRunTime) || 0,
      fertSufTime: Number(sliderDraft.fertSufTime) || 0
    }
  }
}

async function modifyFertParamTopicHttp() {
  if (fertilizeRunning.value) return
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('设备信息缺失')
    return
  }
  try {
    await fismartRrpc(id, buildModifyFertParamPayload(), {
      silent: false,
      loading: true
    })
    await loadFertilizerStatus({ showLoading: false })
  } catch (e) {
    console.error('[ControlFertilizer] modifyFertParamTopic 失败', e)
  }
}

function showSliderAdjustBlockedTip() {
  ElMessageBox.alert(
    '设备处于施肥状态中，请先停止施肥，然后才能手动设置参数',
    '提示',
    { confirmButtonText: '知道了', type: 'warning' }
  )
}

async function loadFertilizerStatus({ showLoading = false } = {}) {
  const id = deviceId.value
  if (id == null || id === '') {
    statusReady.value = true
    return
  }
  const seq = ++requestSeq
  try {
    const res = await fismartRrpc(
      id,
      { MsgType: 'getStatusTopic', Code: 0, Data: 'Sys,Alarm,Sensor' },
      { silent: !showLoading, loading: !!showLoading }
    )
    if (seq !== requestSeq) return
    rrpcData.value = res?.data || null
    syncValveActionState(rrpcData.value)
    syncMixActionState(rrpcData.value)
    if (!isSliderDragging.value) syncProgramSliderDraft()
    if (deviceInfo.value && rrpcData.value) {
      if (rrpcData.value.name) deviceInfo.value.name = rrpcData.value.name
      if (rrpcData.value.isOnline != null) {
        deviceInfo.value.isOnline = rrpcData.value.isOnline
      }
    }
  } catch (e) {
    if (seq !== requestSeq) return
    console.error('[ControlFertilizer] getStatusTopic 失败', e)
    if (!rrpcData.value) {
      ElMessage.error(e?.message || e?.msg || '获取施肥机状态失败')
    }
  } finally {
    if (seq === requestSeq) statusReady.value = true
  }
}

async function loadFertilizerValve({ showError = false } = {}) {
  const id = deviceId.value
  if (id == null || id === '') return
  try {
    const res = await fismartRrpc(
      id,
      { MsgType: 'getRuningValveTopic' },
      { silent: !showError }
    )
    valveRrpcData.value = res?.data || null
    syncValveProgramName()
  } catch (e) {
    console.error('[ControlFertilizer] getRuningValveTopic 失败', e)
  }
}

async function refreshFertilizer({ showLoading = false } = {}) {
  await Promise.all([
    loadFertilizerStatus({ showLoading }),
    loadFertilizerValve({ showError: showLoading })
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

function resetPageState() {
  rrpcData.value = null
  valveRrpcData.value = null
  valveProgramName.value = ''
  statusReady.value = false
  isSliderDragging.value = false
  controlValveActionCache.value = null
  controlMixActionCache.value = null
  isLockAction.value = false
  clearLockActionTimer()
  clearMixActionLock()
  sliderDraft.fertMode = 0
  sliderDraft.fertFlow = 0
  sliderDraft.fertVolum = 0
  sliderDraft.fertRatio = 0
  sliderDraft.fertRunTime = 0
  sliderDraft.fertSufTime = 0
  activeModeIndex.value = 0
}

async function resolveDeviceInfo(id) {
  const cached = farmStore.s_control_device
  if (cached && String(cached.id) === String(id)) {
    deviceInfo.value = { ...cached }
    return
  }
  try {
    const res = await getFismartInfo(id, { silent: true })
    deviceInfo.value = res?.data || { id }
  } catch {
    try {
      const res = await getDeviceDetail(id)
      deviceInfo.value = res?.data || { id }
    } catch (e) {
      console.error('[ControlFertilizer] 获取设备详情失败', e)
      deviceInfo.value = { id }
    }
  }
  farmStore.setControlDevice(deviceInfo.value)
}

/** 对齐 ControlDevice.bootstrap / 移动端 onLoad */
async function bootstrap() {
  resetPageState()
  clearPoll()
  requestSeq += 1

  const cached = farmStore.s_control_device
  const id = route.query.id ?? cached?.id
  if (id == null || id === '') {
    ElMessage.warning('缺少设备信息')
    router.replace('/device')
    return
  }

  await resolveDeviceInfo(id)
  // 对齐移动端 onShow：同 id 时合并 store 更新（如编辑页返回）
  const latest = farmStore.s_control_device
  if (latest && String(latest.id) === String(deviceInfo.value?.id)) {
    deviceInfo.value = { ...deviceInfo.value, ...latest }
  }

  await refreshFertilizer({ showLoading: true })
  startPoll()
}

function onModeTabClick(index) {
  if (fertilizeRunning.value) {
    showSliderAdjustBlockedTip()
    return
  }
  if (activeModeIndex.value === index) return
  activeModeIndex.value = index
  sliderDraft.fertMode = index
  modifyFertParamTopicHttp()
}

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/device')
}

/** 出口：编辑施肥机（页面后续接入） */
function onEdit() {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('缺少设备信息')
    return
  }
  if (deviceInfo.value) farmStore.setControlDevice(deviceInfo.value)
  router.push({
    path: '/device/edit-fertilizer',
    query: { id: String(id) }
  })
}

/** 打开定时列表弹窗（对齐移动端跳转 fertilizer_timer_list） */
function onTimer() {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('缺少设备信息')
    return
  }
  if (deviceInfo.value) farmStore.setControlDevice(deviceInfo.value)
  timerListVisible.value = true
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

/** 手动施肥：runValveTopic，Time 取施肥时长（秒） */
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
    console.error('[ControlFertilizer] runValveTopic 失败', e)
  }
}

/** 停止阀门：stopValveTopic（停止施肥共用） */
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
    console.error('[ControlFertilizer] stopValveTopic 失败', e)
  }
}

/** 手动灌溉/停止灌溉：setStirPumpTopic，Ch=100 */
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
    console.error('[ControlFertilizer] setStirPumpTopic(灌溉) 失败', e)
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

/** 搅拌：setStirPumpTopic，Ch=1，Cmd 1=启动 0=停止 */
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
    // 成功后展示操作目标态，锁定 10s 后再由 getStatusTopic STIRL[1] 同步
    setMixUserAction(cmd === 1, null)
    lockMixActionBriefly()
    await refreshFertilizer({ showLoading: false })
  } catch (e) {
    clearMixActionCache()
    clearMixActionLock()
    console.error('[ControlFertilizer] setStirPumpTopic(搅拌) 失败', e)
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

function handleFarmChange() {
  router.replace('/device')
}

onMounted(() => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)
  bootstrap()
})

onUnmounted(() => {
  offFarmChange?.()
  clearPoll()
  clearLockActionTimer()
  clearMixActionLock()
  onSliderPointerUp()
  resetPageState()
})

watch(
  () => route.query.id,
  (id, prev) => {
    if (id != null && String(id) !== String(prev)) bootstrap()
  }
)
</script>

<style scoped>
.control-fertilizer {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
}

.control-fertilizer__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.control-fertilizer__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  box-sizing: border-box;
}

.control-fertilizer__head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.control-fertilizer__back {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.control-fertilizer__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-fertilizer__edit {
  flex-shrink: 0;
  height: 40px;
  border-radius: 10px;
  background: #3653a0;
  border-color: #3653a0;
}

.control-fertilizer__edit .iconfont {
  margin-right: 6px;
}

.control-fertilizer__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 20px 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  box-sizing: border-box;
}

.control-fertilizer__status-card {
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}

.control-fertilizer__status-card {
  padding: 20px 24px 24px;
}

.control-fertilizer__hero {
  position: relative;
  flex: 1;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-fertilizer__hero-img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  display: block;
}

.control-fertilizer__timer-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #3653a0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(54, 83, 160, 0.28);
}

.control-fertilizer__timer-btn img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
}

.control-fertilizer__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
  padding: 16px 0 8px;
}

.control-fertilizer__metric {
  position: relative;
  text-align: center;
}

.control-fertilizer__metric-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.control-fertilizer__metric-label {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
  line-height: 1.2;
}

.control-fertilizer__metric-divider {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 28px;
  background: #e4e7ed;
}

.control-fertilizer__progress-block {
  margin-top: 12px;
  padding-top: 8px;
}

.control-fertilizer__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.control-fertilizer__progress-label {
  font-size: 13px;
  color: #909399;
}

.control-fertilizer__progress-remain {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.control-fertilizer__progress-track {
  height: 28px;
  border-radius: 14px;
  background: #edf1f6;
  overflow: hidden;
}

.control-fertilizer__progress-fill {
  height: 100%;
  min-width: 0;
  border-radius: 14px;
  background: #71b2f4;
  transition: width 0.2s ease;
}

.control-fertilizer__progress-fill.is-empty {
  background: transparent;
}

/*
 * 右侧卡片：grid 三行 —— Tab / 参数区(1fr 居中) / 操作按钮贴底
 * 对齐设计稿：按钮在卡片底部，中间参数区留白，标签在参数条正下方
 */
.control-fertilizer__panel-card {
  display: grid;
  /* minmax(min-content, 1fr)：中间行至少能放下 320px 参数条，避免被压矮 */
  grid-template-rows: auto minmax(min-content, 1fr) auto;
  height: 100%;
  min-height: 0;
  padding: 20px 24px 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  overflow: auto;
  box-sizing: border-box;
}

.control-fertilizer__tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 60%;
  min-width: 280px;
  max-width: 420px;
  margin: 0 auto;
  padding: 4px;
  border-radius: 999px;
  background: #edf1f6;
}

.control-fertilizer__tab {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.control-fertilizer__tab.is-active {
  background: #003d9b;
  color: #fff;
  font-weight: 600;
  box-shadow: none;
}

.control-fertilizer__tab.is-locked {
  opacity: 0.55;
}

.control-fertilizer__slider-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px 16px;
  overflow: visible;
}

.control-fertilizer__slider-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 128px;
  flex-shrink: 0;
}

.control-fertilizer__slider-col {
  /* 宽度随内联真实 px 轨道撑开，避免 rem 列宽小于 66px 把轨道裁切 */
  width: auto;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: auto;
}

.control-fertilizer__slider-top {
  flex: 0 0 auto;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
}

.control-fertilizer__slider-wrap {
  flex: 0 0 auto;
  box-sizing: border-box;
  cursor: pointer;
  touch-action: none;
  user-select: none;
}

.control-fertilizer__slider-wrap.is-locked {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 宽高由内联真实 px 控制；此处只负责外观，避免再被 pxtorem 写成偏小的 rem */
.control-fertilizer__slider-track {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: #e8edf2;
  overflow: hidden;
  box-sizing: border-box;
}

.control-fertilizer__slider-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  background: #0084f6;
}

.control-fertilizer__slider-thumb {
  position: absolute;
  left: 0;
  z-index: 2;
  width: 100%;
  height: var(--cf-thumb-h);
  padding: 0 2px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  box-sizing: border-box;
  pointer-events: none;
}

.control-fertilizer__slider-label {
  flex: 0 0 auto;
  margin: 14px 0 0;
  padding: 0;
  width: 100%;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  text-align: center;
  line-height: 1.4;
  white-space: nowrap;
}

.control-fertilizer__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-top: 8px;
}

.control-fertilizer__action-btn {
  height: 58px;
  border: none;
  border-radius: 8px;
  background: #007d3d;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  /* 底边为主，右边略薄一点，避免右侧投影过重 */
  box-shadow:
    2px 0 0 #005a2d,
    0 4px 0 #005a2d,
    2px 4px 0 #005a2d,
    3px 8px 14px rgba(0, 125, 61, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.control-fertilizer__action-btn:hover:not(.is-disabled) {
  transform: translateY(-1px);
  box-shadow:
    2px 0 0 #005a2d,
    0 5px 0 #005a2d,
    2px 5px 0 #005a2d,
    4px 10px 18px rgba(0, 125, 61, 0.32);
}

.control-fertilizer__action-btn:active:not(.is-disabled) {
  transform: translate(1px, 2px);
  box-shadow:
    1px 0 0 #005a2d,
    0 2px 0 #005a2d,
    1px 2px 0 #005a2d,
    2px 4px 10px rgba(0, 125, 61, 0.24);
}

/* 对齐移动端停止态：红色底 */
.control-fertilizer__action-btn.is-stop {
  background: #c02c2d;
  box-shadow:
    2px 0 0 #8f1f20,
    0 4px 0 #8f1f20,
    2px 4px 0 #8f1f20,
    3px 8px 14px rgba(192, 44, 45, 0.28);
}

.control-fertilizer__action-btn.is-stop:hover:not(.is-disabled) {
  box-shadow:
    2px 0 0 #8f1f20,
    0 5px 0 #8f1f20,
    2px 5px 0 #8f1f20,
    4px 10px 18px rgba(192, 44, 45, 0.32);
}

.control-fertilizer__action-btn.is-stop:active:not(.is-disabled) {
  box-shadow:
    1px 0 0 #8f1f20,
    0 2px 0 #8f1f20,
    1px 2px 0 #8f1f20,
    2px 4px 10px rgba(192, 44, 45, 0.24);
}

.control-fertilizer__action-btn.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.control-fertilizer__action-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .control-fertilizer__body {
    grid-template-columns: 1fr;
  }

  .control-fertilizer__panel-card {
    height: auto;
    min-height: 560px;
  }
}
</style>
