<template>
  <div class="group-detail-page">
    <div class="group-detail-page__head">
      <div class="group-detail-page__head-left">
        <button type="button" class="group-detail-page__back" @click="onBack">
          ← 返回
        </button>
        <h1 class="group-detail-page__title">{{ displayName }}</h1>
      </div>
      <el-button type="primary" class="group-detail-page__edit" @click="onEdit">
        <i class="iconfont icon-a-device_ic_edit1"></i>
        编辑轮灌组
      </el-button>
    </div>

    <div v-loading="loading && !groupInfo" class="group-detail-page__body">
      <div class="group-detail-top">
        <div class="group-detail-map-card">
          <div v-if="!mapReady" class="group-detail-map-card__loading">地图加载中...</div>
          <div id="group-detail-map" class="group-detail-map-card__map"></div>
          <!-- 对齐移动端 customLogo：隐藏高德标志，展示能手地图 -->
          <div class="group-detail-map-brand" aria-hidden="true">
            <img
              class="group-detail-map-brand__img"
              src="https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/logo.png"
              alt=""
            />
            <span class="group-detail-map-brand__text">能手地图</span>
          </div>
          <div v-if="areaLabel" class="group-detail-map-card__area">
            圈地面积：{{ areaLabel }}
          </div>
        </div>

        <aside class="group-detail-side">
          <div class="group-detail-side__card">
            <div class="group-detail-side__head">
              <h2 class="group-detail-side__name">{{ displayName }}</h2>
            </div>

            <div class="group-detail-side__runtime">
              <template v-if="showRuntimeBanner">
                <div
                  class="group-detail-side__run-ring"
                  :class="{ 'is-running': isShowRunning }"
                >
                  <img
                    class="group-detail-side__run-disc"
                    :class="{ 'is-rotate': isShowRunning }"
                    :src="runningDiscImg"
                    alt=""
                  />
                  <div class="group-detail-side__run-ring-inner">
                    <i class="iconfont" :class="runIconClass"></i>
                    <span>{{ runIconText }}</span>
                  </div>
                </div>
                <div class="group-detail-side__runtime-info">
                  <template v-if="isShowRunning">
                    <div class="group-detail-side__stat">
                      <span class="group-detail-side__stat-label">运行时长</span>
                      <span class="group-detail-side__stat-value">{{ runDurationText }}</span>
                    </div>
                    <div class="group-detail-side__stat">
                      <span class="group-detail-side__stat-label">累计流量</span>
                      <span class="group-detail-side__stat-value">{{ flowText }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="group-detail-side__stat is-next">
                      <span class="group-detail-side__stat-label">下次启动时间</span>
                      <span v-if="nextRunDateText" class="group-detail-side__stat-date">
                        {{ nextRunDateText }}
                      </span>
                      <span class="group-detail-side__stat-value">
                        {{ nextRunClockText }}
                      </span>
                    </div>
                  </template>
                </div>
              </template>
              <div v-else class="group-detail-side__runtime-empty"></div>
            </div>

            <div class="group-detail-side__batch">
              <div class="group-detail-side__batch-label">全部出水口</div>
              <button
                type="button"
                class="group-detail-side__batch-btn"
                :class="batchIsClose ? 'is-close' : 'is-open'"
                :disabled="batchLoading || !groupInfo?.id || isBatchLocked"
                @click="onBatchToggle"
              >
                <span class="group-detail-side__batch-badge">{{ portCountText }}</span>
                <span>{{ batchIsClose ? '批量关' : '批量开' }}</span>
              </button>
            </div>
          </div>

          <div class="group-detail-side__actions">
            <button
              type="button"
              class="group-detail-side__action"
              :class="{ 'is-active': activeSideAction === 'record' }"
              @click="onRecord"
            >
              <img class="group-detail-side__action-icon" :src="icRecord" alt="" />
              <span>记录</span>
            </button>
            <button
              type="button"
              class="group-detail-side__action"
              :class="{ 'is-active': activeSideAction === 'avePress' }"
              @click="onAvePress"
            >
              <img class="group-detail-side__action-icon" :src="icAvePress" alt="" />
              <span>一键均压</span>
            </button>
            <button
              type="button"
              class="group-detail-side__action"
              :class="{ 'is-active': activeSideAction === 'timer' }"
              @click="onTimer"
            >
              <img class="group-detail-side__action-icon" :src="icTimer" alt="" />
              <span>定时控制</span>
            </button>
          </div>
        </aside>
      </div>

      <section class="group-detail-outlets">
        <h3 class="group-detail-outlets__title">本轮灌组关联的出水桩</h3>
        <div v-if="!outletPiles.length" class="group-detail-outlets__empty">
          暂无关联出水桩
        </div>
        <div v-else class="group-detail-outlets__grid">
          <article
            v-for="pile in outletPiles"
            :key="pile.id"
            class="outlet-card"
            :class="{ 'is-offline': !pile.isOnline }"
          >
            <div class="outlet-card__top">
              <div class="outlet-card__top-left">
                <div class="outlet-card__name">{{ pile.name || '出水桩' }}</div>
                <span
                  class="outlet-card__status"
                  :class="pile.isOnline ? 'is-online' : 'is-offline'"
                >
                  <i class="outlet-card__status-dot"></i>
                  {{ getOnlineText(pile) }}
                </span>
              </div>
              <div class="outlet-card__top-right">
                <i
                  v-if="Number(pile.ds) === 9"
                  class="iconfont icon-a-lujing1 outlet-card__manual"
                  title="手动态"
                ></i>
                <i
                  v-if="isDvAlarm(pile.id)"
                  class="iconfont icon-lujing-1 outlet-card__alarm"
                  title="告警中"
                ></i>
                <span
                  class="outlet-card__battery"
                  :class="{ 'is-low': (pile.batteryPercent ?? 0) <= 20 }"
                >
                  {{ pile.batteryPercent ?? 0 }}%
                  <i class="iconfont icon-map_ic_battery"></i>
                </span>
              </div>
            </div>
            <img
              class="outlet-card__img"
              :src="pile.isOnline ? outletOnlineImg : outletOfflineImg"
              alt=""
            />
            <div class="outlet-card__ports">
              <button
                type="button"
                class="outlet-card__port"
                :class="portBtnClass(pile, 1)"
                :disabled="isPortDisabled(pile)"
                @click="onPortToggle(pile, 1)"
              >
                <template v-if="isPortOpen(pile, 1)">
                  <span>{{ portOpeningText(pile, 1) }}</span>
                  <span class="outlet-card__port-badge">{{ portName(pile, 1) }}</span>
                </template>
                <template v-else>
                  <span class="outlet-card__port-badge">{{ portName(pile, 1) }}</span>
                  <span>{{ portOpeningText(pile, 1) }}</span>
                </template>
              </button>
              <button
                type="button"
                class="outlet-card__port"
                :class="portBtnClass(pile, 2)"
                :disabled="isPortDisabled(pile)"
                @click="onPortToggle(pile, 2)"
              >
                <template v-if="isPortOpen(pile, 2)">
                  <span>{{ portOpeningText(pile, 2) }}</span>
                  <span class="outlet-card__port-badge">{{ portName(pile, 2) }}</span>
                </template>
                <template v-else>
                  <span class="outlet-card__port-badge">{{ portName(pile, 2) }}</span>
                  <span>{{ portOpeningText(pile, 2) }}</span>
                </template>
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <SwitchRecordDialog
      v-model="recordVisible"
      :target-id="groupInfo?.id"
      :target-type="1"
    />

    <TimerProListDialog
      v-model="timerListVisible"
      from="group"
      :target-id="groupInfo?.id"
    />

    <AvePressDialog
      v-model="avePressVisible"
      :group-id="groupInfo?.id"
    />

    <GroupEditDialog
      v-model="editVisible"
      @saved="onEditSaved"
    />
  </div>
</template>

<script setup>
/**
 * 轮灌组详情（PC）
 * 对齐移动端 map-group-detail + control-group
 * 布局：左上地图 / 右侧程序信息与操作 / 下方关联出水桩
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getFarmInfo } from '@/api/map'
import {
  closeAllWaterDv,
  getGroupDetail,
  openAllWaterDv
} from '@/api/irrigationGroup'
import { closeWaterDv, openWaterDv } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import { useAlarmStore } from '@/store/alarm'
import {
  confirmWaterOutletRisk,
  RISK_MSG_OPEN
} from '@/composables/useWaterOutletRiskDialog'
import { parseAreaJson } from '@/utils/farmMapData'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import { createWaterDvMarkerDrawer } from '@/utils/farmMapWaterDv'
import outletOnlineImg from '@/assets/map/outlet-device-online.svg'
import outletOfflineImg from '@/assets/map/outlet-device-offline.svg'
import runningDiscImg from '@/assets/device/device_img_running.png'
import icRecord from '@/assets/irrigation-group/ic_record.png'
import icAvePress from '@/assets/irrigation-group/ic_ave_press.png'
import icTimer from '@/assets/irrigation-group/ic_timer.png'
import SwitchRecordDialog from './SwitchRecordDialog.vue'
import TimerProListDialog from './TimerProListDialog.vue'
import AvePressDialog from './AvePressDialog.vue'
import GroupEditDialog from './GroupEditDialog.vue'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()
const alarmStore = useAlarmStore()
const landPolygonDrawer = createLandPolygonDrawer()
const waterDvMarkerDrawer = createWaterDvMarkerDrawer()

/** 对齐移动端 control-group setAlarmStatus / isAlarming */
function isDvAlarm(deviceId) {
  return alarmStore.isDvAlarm(deviceId)
}

const POLL_MS = 3000
const LOCK_SECONDS = 10
const OPEN_VALVE_ACTIONS = [0, 1, 3, 5, 7, 9, 11, 13]

const groupInfo = ref(null)
const loading = ref(false)
const syncing = ref(false)
const syncTimeText = ref('--')
const mapReady = ref(false)
const batchLoading = ref(false)
const runTick = ref(0)
const isLockControl = ref(false)
const batchSwitchLocked = ref(null)
const recordVisible = ref(false)
const timerListVisible = ref(false)
const avePressVisible = ref(false)
const editVisible = ref(false)
/** 侧栏操作栏选中态（仅 UI） */
const activeSideAction = ref('')
/** 对齐移动端 isModalShow：40102 风险弹窗期间暂停轮询 */
const isModalShow = ref(false)
/** 批量操作 UI 锁定截止时间（响应式） */
const lockUntil = ref(0)

let map = null
let farmDevices = []
let pollTimer = null
let runTickTimer = null
let detailRequestId = 0
let batchLockTimer = null
/** 对齐移动端 hasFittedView：仅首次适配视野 */
let hasFittedView = false
/** 乐观控制中的出水桩 id → 本地 pile 快照 */
const controlWaterOutletList = {}

const displayName = computed(
  () =>
    groupInfo.value?.name ||
    farmStore.s_group_list_item?.name ||
    '未命名轮灌组'
)

const areaLabel = computed(() => {
  const area = groupInfo.value?.area
  if (area == null || area === '') return ''
  const num = Number(area)
  return Number.isFinite(num) ? `${num.toFixed(2)}亩` : ''
})

const outletPiles = computed(() =>
  Array.isArray(groupInfo.value?.outletPiles) ? groupInfo.value.outletPiles : []
)

const isShowRunning = computed(() =>
  outletPiles.value.some((pile) =>
    (pile.waterOutletPile?.ports || []).some(
      (p) => Number(p.currentOpening) > 0 || p.isOpen
    )
  )
)

const openPortCount = computed(() => {
  let n = 0
  outletPiles.value.forEach((pile) => {
    const valveAction = pile.waterOutletPile?.valveAction
    ;(pile.waterOutletPile?.ports || []).forEach((port) => {
      const opening = Number(port.currentOpening) || 0
      const open = port.isOpen != null ? !!port.isOpen : opening > 0
      if (!open && opening <= 0) return
      if (valveAction == null || OPEN_VALVE_ACTIONS.includes(valveAction)) {
        n += 1
      }
    })
  })
  return n
})

const totalPortCount = computed(() => {
  let n = 0
  outletPiles.value.forEach((pile) => {
    n += (pile.waterOutletPile?.ports || []).length
  })
  return n
})

const portCountText = computed(
  () => `${openPortCount.value}/${totalPortCount.value}`
)

const isBatchLocked = computed(() => lockUntil.value > Date.now())

const batchIsClose = computed(() => {
  if (isBatchLocked.value && batchSwitchLocked.value != null) {
    return batchSwitchLocked.value
  }
  return openPortCount.value > 0 || isShowRunning.value
})

const showRuntimeBanner = computed(
  () =>
    !!(
      groupInfo.value?.deviceNexRunTime ||
      (groupInfo.value?.deviceRuntime && isShowRunning.value)
    )
)

const runIconText = computed(() => {
  const src =
    isShowRunning.value && groupInfo.value?.deviceRuntime
      ? groupInfo.value.deviceRuntime
      : groupInfo.value?.deviceNexRunTime
  if (!src) return '--'
  // 对齐移动端：runStatus==5 → 一键均压；仅 tiggerObject==2 为自动轮灌
  if (src.runStatus == 5) return '一键均压'
  if (src.tiggerObject == 2) return '自动轮灌'
  if (src.mode == 0) return '手动'
  if (src.mode == 1) return '定时'
  return '--'
})

const runIconClass = computed(() => {
  const src =
    isShowRunning.value && groupInfo.value?.deviceRuntime
      ? groupInfo.value.deviceRuntime
      : groupInfo.value?.deviceNexRunTime
  if (!src) return 'icon-device_ic_timing'
  if (src.runStatus == 5) return 'icon-group_ic_noti_01'
  if (src.tiggerObject == 2) return 'icon-home_ic_foot_program_01'
  if (src.mode == 0) return 'icon-device_ic_manual'
  if (src.mode == 1) return 'icon-device_ic_timing'
  return 'icon-device_ic_timing'
})

const pad2 = (n) => String(n).padStart(2, '0')

const formatUtc = (utcStr, fmt = 'full') => {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const h = pad2(d.getHours())
  const mi = pad2(d.getMinutes())
  const s = pad2(d.getSeconds())
  if (fmt === 'cn') return `${y}年-${Number(m)}月-${Number(day)}日 ${h}:${mi}`
  if (fmt === 'mdhms') return `${m}-${day} ${h}:${mi}:${s}`
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}

const calcRunTime = (startUtc) => {
  void runTick.value
  if (!startUtc) return '--'
  const start = new Date(startUtc).getTime()
  if (Number.isNaN(start)) return '--'
  const diffMs = Date.now() - start
  if (diffMs <= 0) return '00:00:00'
  const diffS = Math.floor(diffMs / 1000)
  const day = Math.floor(diffS / (3600 * 24))
  const h = Math.floor((diffS % (3600 * 24)) / 3600)
  const m = Math.floor((diffS % 3600) / 60)
  const s = diffS % 60
  const timeStr = `${pad2(h)}:${pad2(m)}:${pad2(s)}`
  return day > 0 ? `${day}天 ${timeStr}` : timeStr
}

const runDurationText = computed(() =>
  calcRunTime(groupInfo.value?.deviceRuntime?.startTime)
)

const nextRunDateText = computed(() => {
  const utc = groupInfo.value?.deviceNexRunTime?.nextRunTime
  if (!utc) return ''
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年-${d.getMonth() + 1}月-${d.getDate()}日`
})

const nextRunClockText = computed(() => {
  const utc = groupInfo.value?.deviceNexRunTime?.nextRunTime
  if (!utc) return '--'
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
})

const flowText = computed(() => {
  const v =
    groupInfo.value?.deviceRuntime?.accumulatedFlow ??
    groupInfo.value?.accumulatedFlow
  if (v == null || v === '') return '--'
  return `${v}m³`
})

function getGroupId() {
  return (
    route.query.id ||
    farmStore.s_group_list_item?.id ||
    farmStore.s_group_detail_info?.id ||
    null
  )
}

function getFarmId() {
  return (
    farmStore.s_selectFarm?.id ??
    farmStore.selectFarm?.id ??
    farmStore.s_farm_info?.id ??
    null
  )
}

function findPort(pile, outletNo) {
  return (pile?.waterOutletPile?.ports || []).find(
    (p) => Number(p.outletNo) === Number(outletNo)
  )
}

function portName(pile, outletNo) {
  const port = findPort(pile, outletNo)
  return port?.outletName || (outletNo === 1 ? 'A' : 'B')
}

function isPortOpen(pile, outletNo) {
  const port = findPort(pile, outletNo)
  if (!port) return false
  if (port.isOpen != null) return !!port.isOpen
  return Number(port.currentOpening) > 0
}

function portOpeningText(pile, outletNo) {
  const port = findPort(pile, outletNo)
  if (!port) return '0%'
  return `${Math.round(Number(port.currentOpening) || 0)}%`
}

function portBtnClass(pile, outletNo) {
  const open = isPortOpen(pile, outletNo)
  const valveBusy = Number(pile?.waterOutletPile?.valveAction) !== 0
  return {
    'is-open': open,
    'is-close': !open,
    'is-blink': valveBusy && !!findPort(pile, outletNo)
  }
}

function isPortDisabled(pile) {
  if (!pile?.isOnline) return true
  if (Number(pile.ds) === 9) return true
  if (isLockControl.value) return true
  if (Number(pile.waterOutletPile?.valveAction) !== 0) return true
  return false
}

/** 对齐移动端 getOnlienText：在线 / 关机原因 / 离线；手动态用独立图标 */
function getOnlineText(pile) {
  if (pile?.isOnline) return '在线'
  const ds = Number(pile?.ds)
  const map = {
    1: '定时关机',
    2: '低温关机',
    3: '低电量关机',
    4: '本地关机',
    5: '远程关机'
  }
  return map[ds] || '离线'
}

function normalizePorts(info) {
  const piles = Array.isArray(info?.outletPiles) ? info.outletPiles : []
  piles.forEach((pile) => normalizePile(pile))
  return info
}

function normalizePile(pile) {
  if (!pile) return pile
  const ports = pile.waterOutletPile?.ports || []
  ports.forEach((port) => {
    if (port.isOpen == null) {
      port.isOpen = Number(port.currentOpening) > 0
    }
  })
  return pile
}

function getPortFromWaterOut(waterOut, outletNo) {
  return (waterOut?.ports || []).find(
    (p) => Number(p.outletNo) === Number(outletNo)
  )
}

/**
 * 对齐移动端 getReplace0：阀动作结束后，确认开度是否到达目标再替换本地乐观态
 */
function getReplace0(oldWaterOut, waterOut) {
  if (!oldWaterOut || !waterOut) return false
  const action = Number(oldWaterOut.valveAction)
  if (action === 99) return true

  const portA = getPortFromWaterOut(waterOut, 1)
  const portB = getPortFromWaterOut(waterOut, 2)

  if (action === 1 && portA) {
    return (
      Math.round(Number(portA.currentOpening) || 0) >=
      Math.round(Number(portA.defaultOpening) || 0)
    )
  }
  if (action === 3 && portB) {
    return (
      Math.round(Number(portB.currentOpening) || 0) >=
      Math.round(Number(portB.defaultOpening) || 0)
    )
  }
  if (action === 2 && portA) {
    return Math.round(Number(portA.currentOpening) || 0) <= 0
  }
  if (action === 4 && portB) {
    return Math.round(Number(portB.currentOpening) || 0) <= 0
  }
  return false
}

function syncPortOpeningPressure(oldWaterOut, newWaterOut) {
  ;(newWaterOut?.ports || []).forEach((newPort) => {
    const oldPort = (oldWaterOut?.ports || []).find(
      (op) => Number(op.outletNo) === Number(newPort.outletNo)
    )
    if (oldPort) {
      oldPort.currentOpening = newPort.currentOpening
      oldPort.pressure = newPort.pressure
    }
  })
}

/**
 * 对齐移动端 mergeData + getReplace0：
 * - 控制中且服务端 valveAction!=0：保留乐观态，仅同步开度/压力
 * - 控制中且服务端 valveAction==0：按 getReplace0 决定是否替换
 * - 无控制缓存：采用服务端
 */
function mergeDetailKeepControl(newInfo) {
  if (!newInfo) return null
  const next = normalizePorts({ ...newInfo })
  const oldPiles = Array.isArray(groupInfo.value?.outletPiles)
    ? groupInfo.value.outletPiles
    : []
  const newPiles = Array.isArray(next.outletPiles) ? next.outletPiles : []

  // 首次：直接用服务端
  if (!oldPiles.length) {
    return next
  }

  const newIdSet = new Set(newPiles.map((p) => String(p.id)))
  const mergedPiles = oldPiles
    .filter((oldDev) => {
      const exist = newIdSet.has(String(oldDev.id))
      if (!exist) {
        const waterOutId = oldDev.waterOutletPile?.id
        if (waterOutId != null && controlWaterOutletList[waterOutId]) {
          delete controlWaterOutletList[waterOutId]
        }
      }
      return exist
    })
    .map((oldDev) => {
      const newDev = newPiles.find((nd) => String(nd.id) === String(oldDev.id))
      if (!newDev) return oldDev

      const waterOut = newDev.waterOutletPile
      const oldWaterOutCached = waterOut?.id
        ? controlWaterOutletList[waterOut.id]
        : null

      if (oldWaterOutCached) {
        if (
          Number(oldWaterOutCached.valveAction) !== 0 &&
          Number(waterOut?.valveAction) === 0
        ) {
          if (getReplace0(oldWaterOutCached, waterOut)) {
            delete controlWaterOutletList[waterOut.id]
            return normalizePile({ ...newDev })
          }
          // 尚未到达目标开度：保留本地乐观态，只同步开度/压力
          const kept = JSON.parse(JSON.stringify(oldDev))
          if (kept.waterOutletPile) {
            kept.waterOutletPile.valveAction = oldWaterOutCached.valveAction
            syncPortOpeningPressure(kept.waterOutletPile, waterOut)
            ;(kept.waterOutletPile.ports || []).forEach((port) => {
              const cachedPort = (oldWaterOutCached.ports || []).find(
                (p) => Number(p.outletNo) === Number(port.outletNo)
              )
              if (cachedPort && cachedPort.isOpen != null) {
                port.isOpen = cachedPort.isOpen
              }
            })
          }
          return kept
        }

        // 服务端仍在动作中，或本地与服务端都未结束：保留乐观态，同步开度
        const kept = JSON.parse(JSON.stringify(oldDev))
        if (kept.waterOutletPile) {
          kept.waterOutletPile.valveAction = oldWaterOutCached.valveAction
          syncPortOpeningPressure(kept.waterOutletPile, waterOut)
          ;(kept.waterOutletPile.ports || []).forEach((port) => {
            const cachedPort = (oldWaterOutCached.ports || []).find(
              (p) => Number(p.outletNo) === Number(port.outletNo)
            )
            if (cachedPort && cachedPort.isOpen != null) {
              port.isOpen = cachedPort.isOpen
            }
          })
        }
        // 同步非控制字段
        kept.isOnline = newDev.isOnline
        kept.batteryPercent = newDev.batteryPercent
        kept.ds = newDev.ds
        kept.name = newDev.name
        return kept
      }

      return normalizePile({ ...newDev })
    })

  // 追加服务端新增出水桩
  newPiles.forEach((newDev) => {
    if (!mergedPiles.some((old) => String(old.id) === String(newDev.id))) {
      mergedPiles.push(normalizePile({ ...newDev }))
    }
  })

  return {
    ...next,
    outletPiles: mergedPiles
  }
}

function ensureRunTick() {
  if (runTickTimer) return
  if (!isShowRunning.value) return
  runTickTimer = setInterval(() => {
    runTick.value += 1
    if (!isShowRunning.value) {
      clearInterval(runTickTimer)
      runTickTimer = null
    }
  }, 1000)
}

function clearRunTick() {
  if (runTickTimer) {
    clearInterval(runTickTimer)
    runTickTimer = null
  }
}

async function fetchDetail({ silent = false, showLoading = false } = {}) {
  const id = getGroupId()
  if (id == null) {
    ElMessage.warning('缺少轮灌组信息')
    return
  }
  const requestId = ++detailRequestId
  if (showLoading) loading.value = true
  syncing.value = !silent
  try {
    const res = await getGroupDetail(id, { silent })
    if (requestId !== detailRequestId) return
    const raw = res?.data || null
    if (!raw) {
      if (!groupInfo.value) ElMessage.error('获取轮灌组详情失败')
      return
    }

    // 对齐移动端：首次整量赋值；之后合并运行态 + outletPiles（getReplace0）
    if (!groupInfo.value) {
      groupInfo.value = normalizePorts({ ...raw })
    } else {
      const merged = mergeDetailKeepControl(raw)
      groupInfo.value = {
        ...groupInfo.value,
        ...merged,
        deviceRuntime: raw.deviceRuntime,
        deviceNexRunTime: raw.deviceNexRunTime,
        accumulatedFlow: raw.accumulatedFlow,
        outletPiles: merged?.outletPiles || groupInfo.value.outletPiles
      }
    }
    farmStore.setGroupDetailInfo(groupInfo.value)
    syncTimeText.value = formatUtc(new Date().toISOString(), 'mdhms') || '--'
    ensureRunTick()
    refreshMapFromDetail()
  } catch (e) {
    if (requestId !== detailRequestId) return
    console.error('[GroupDetail] 获取详情失败', e)
    if (!groupInfo.value) ElMessage.error('获取轮灌组详情失败')
  } finally {
    if (requestId === detailRequestId) {
      loading.value = false
      syncing.value = false
    }
  }
}

function onSync(manual = true) {
  fetchDetail({ silent: !manual, showLoading: manual })
}

function clearBatchLockTimer() {
  if (batchLockTimer) {
    clearTimeout(batchLockTimer)
    batchLockTimer = null
  }
}

function clearBatchLock(restoreSwitch = null) {
  clearBatchLockTimer()
  lockUntil.value = 0
  if (restoreSwitch !== undefined) {
    batchSwitchLocked.value = restoreSwitch
  }
}

function setBatchLock(isClose) {
  clearBatchLockTimer()
  lockUntil.value = Date.now() + LOCK_SECONDS * 1000
  batchSwitchLocked.value = isClose
  // 到期后主动清锁，保证按钮禁用态能响应式恢复
  batchLockTimer = setTimeout(() => {
    lockUntil.value = 0
    batchSwitchLocked.value = null
    batchLockTimer = null
  }, LOCK_SECONDS * 1000)
}

async function onBatchToggle() {
  const id = groupInfo.value?.id
  if (id == null || batchLoading.value || isBatchLocked.value) return

  const prevClose = batchIsClose.value
  const optimisticClose = !prevClose
  setBatchLock(optimisticClose)
  batchLoading.value = true

  try {
    if (prevClose) {
      await closeAllWaterDv({ id, force: false }, { silent: true })
    } else {
      await openAllWaterDv({ groupId: id, openingType: 0 }, { silent: true })
    }
    ElMessage.success('操作成功')
    setBatchLock(optimisticClose)
    await fetchDetail({ silent: true })
  } catch (e) {
    const code = e?.code
    if (prevClose && code === 40102) {
      isModalShow.value = true
      try {
        const ok = await confirmWaterOutletRisk({
          message: e?.message
            ? `${e.message}是否强制关闭？`
            : '是否强制关闭？',
          confirmText: '强制关闭'
        })
        if (ok) {
          await closeAllWaterDv({ id, force: true }, { silent: true })
          ElMessage.success('操作成功')
          setBatchLock(false)
          await fetchDetail({ silent: true })
        } else {
          clearBatchLock(prevClose)
        }
      } finally {
        isModalShow.value = false
      }
    } else {
      clearBatchLock(prevClose)
      if (code !== 40102) ElMessage.error(e?.message || '操作失败')
      console.error('[GroupDetail] 批量开关失败', e)
    }
  } finally {
    batchLoading.value = false
  }
}

async function onPortToggle(pile, outletNo) {
  if (isPortDisabled(pile)) {
    if (Number(pile?.ds) === 9) {
      ElMessage.warning('当前设备处于手动状态，无法远程操作，只能现场操作')
    }
    return
  }
  const waterOut = pile.waterOutletPile
  const port = findPort(pile, outletNo)
  if (!waterOut?.id || !port) return

  const willOpen = !isPortOpen(pile, outletNo)
  // 乐观更新
  ;(waterOut.ports || []).forEach((p) => {
    if (Number(p.outletNo) === Number(outletNo)) {
      p.isOpen = willOpen
    } else if (willOpen) {
      p.isOpen = false
    }
  })
  if (willOpen) {
    waterOut.valveAction = outletNo === 1 ? 1 : 3
  } else {
    waterOut.valveAction = outletNo === 1 ? 2 : 4
  }
  controlWaterOutletList[waterOut.id] = {
    valveAction: waterOut.valveAction,
    ports: (waterOut.ports || []).map((p) => ({ ...p }))
  }

  if (willOpen) {
    await openPortHttp(waterOut, port, false)
  } else {
    await closePortHttp(waterOut, port, false)
  }
}

async function openPortHttp(waterOut, port, force) {
  try {
    await openWaterDv(
      {
        force: !!force,
        waterOutletId: waterOut.id,
        outPorts: [
          {
            outletNo: port.outletNo,
            opening: port.defaultOpening
          }
        ]
      },
      { silent: true }
    )
    ElMessage.success('操作成功')
    await fetchDetail({ silent: true })
  } catch (e) {
    if (e?.code === 40102 && !force) {
      isModalShow.value = true
      try {
        const ok = await confirmWaterOutletRisk({
          message: RISK_MSG_OPEN,
          confirmText: '强制打开'
        })
        if (ok) {
          await openPortHttp(waterOut, port, true)
        } else {
          delete controlWaterOutletList[waterOut.id]
          await fetchDetail({ silent: true })
        }
      } finally {
        isModalShow.value = false
      }
      return
    }
    delete controlWaterOutletList[waterOut.id]
    await fetchDetail({ silent: true })
    if (e?.code !== 40102) ElMessage.error(e?.message || '打开失败')
  }
}

async function closePortHttp(waterOut, port, force) {
  isLockControl.value = true
  try {
    await closeWaterDv(
      {
        force: !!force,
        waterOutletId: waterOut.id,
        outPorts: [{ outletNo: port.outletNo }]
      },
      { silent: true }
    )
    ElMessage.success('操作成功')
    await fetchDetail({ silent: true })
  } catch (e) {
    if (e?.code === 40102 && !force) {
      isModalShow.value = true
      try {
        const ok = await confirmWaterOutletRisk({
          message: e?.message
            ? `${e.message}是否强制关闭？`
            : '是否强制关闭？',
          confirmText: '强制关闭'
        })
        if (ok) {
          await closePortHttp(waterOut, port, true)
        } else {
          delete controlWaterOutletList[waterOut.id]
          await fetchDetail({ silent: true })
        }
      } finally {
        isModalShow.value = false
      }
      return
    }
    delete controlWaterOutletList[waterOut.id]
    await fetchDetail({ silent: true })
    if (e?.code !== 40102) ElMessage.error(e?.message || '关闭失败')
  } finally {
    isLockControl.value = false
  }
}

function onBack() {
  if (route.query.from === 'pro') {
    router.replace('/irrigation-program')
    return
  }
  if (window.history.length > 1) router.back()
  else router.replace('/irrigation-group')
}

function onEdit() {
  if (!groupInfo.value?.id) {
    ElMessage.warning('请先加载轮灌组详情')
    return
  }
  farmStore.setGroupDetailInfo(groupInfo.value)
  farmStore.setEditGroupDraft(null)
  farmStore.setChosePort(null)
  farmStore.setPendingGroupChange(null)
  editVisible.value = true
}

async function onEditSaved() {
  await fetchDetail({ showLoading: true, silent: false })
  refreshMapFromDetail()
}

function shouldResumeEditDialog() {
  const id = getGroupId()
  const draft = farmStore.s_edit_group_draft
  return !!(draft?.id && id != null && String(draft.id) === String(id))
}

function onRecord() {
  if (!groupInfo.value?.id) {
    ElMessage.warning('请先加载轮灌组详情')
    return
  }
  activeSideAction.value = 'record'
  farmStore.setGroupDetailInfo(groupInfo.value)
  recordVisible.value = true
}

function onTimer() {
  if (!groupInfo.value?.id) {
    ElMessage.warning('请先加载轮灌组详情')
    return
  }
  activeSideAction.value = 'timer'
  farmStore.setGroupDetailInfo(groupInfo.value)
  timerListVisible.value = true
}

function onAvePress() {
  if (!groupInfo.value?.id) {
    ElMessage.warning('请先加载轮灌组详情')
    return
  }
  activeSideAction.value = 'avePress'
  // 对齐移动端：均压页读 vuex_group_list_item
  farmStore.setGroupListItem(groupInfo.value)
  farmStore.setGroupDetailInfo(groupInfo.value)
  avePressVisible.value = true
}

function refreshMapFromDetail() {
  if (!map || !groupInfo.value) return
  const areaObj = parseAreaJson(groupInfo.value.areaJson)
  const landList =
    areaObj.landPoint?.length >= 3
      ? [
          {
            id: groupInfo.value.id,
            name: groupInfo.value.name,
            landPoint: areaObj.landPoint,
            fillColor: areaObj.fillColor || '#2196F3',
            area: groupInfo.value.area,
            areaMu:
              groupInfo.value.area != null
                ? Number(groupInfo.value.area).toFixed(2)
                : undefined
          }
        ]
      : []

  const deviceIds = new Set(
    (groupInfo.value.outletPiles || []).map((p) => String(p.id))
  )
  const devices = farmDevices
    .filter((d) => deviceIds.has(String(d.id)))
    .map((d) => {
      const copy = JSON.parse(JSON.stringify(d))
      const pile = (groupInfo.value.outletPiles || []).find(
        (p) => String(p.id) === String(d.id)
      )
      const ports = copy.specificData?.waterOutletPile?.ports || []
      ports.forEach((port) => {
        const gp = (pile?.waterOutletPile?.ports || []).find(
          (x) => x.id === port.id
        )
        if (gp) {
          port.currentOpening = gp.currentOpening
          port.isCheck = Number(gp.currentOpening) > 0 || !!gp.isOpen
        }
      })
      return copy
    })

  const layerOptions = [
    { value: 'land', isChose: true },
    { value: 'waterDv', isChose: true }
  ]
  landPolygonDrawer.drawLandPolygon(map, landList, {
    layerOptions,
    readOnly: true,
    labelSuffix: '(轮灌组)'
  })
  waterDvMarkerDrawer.drawAllWaterDvMarker(map, devices, { layerOptions })

  // 对齐移动端 hasFittedView：仅首次 setFitView，轮询刷新不跳视野
  if (!hasFittedView) {
    const overlays = [
      ...(landPolygonDrawer.landPolygonList || []),
      ...(waterDvMarkerDrawer.waterDvMarkers || [])
    ]
    if (overlays.length) {
      try {
        map.setFitView(overlays, false, [40, 40, 40, 40])
        hasFittedView = true
      } catch (e) {
        /* ignore */
      }
    }
  }
}

async function loadFarmDevices() {
  const farmId = getFarmId()
  if (farmId == null) return
  try {
    const res = await getFarmInfo(farmId)
    farmDevices = Array.isArray(res?.data?.devices) ? res.data.devices : []
    refreshMapFromDetail()
  } catch (e) {
    console.error('[GroupDetail] 加载农场设备失败', e)
  }
}

function destroyMap() {
  landPolygonDrawer.destroy?.(map)
  waterDvMarkerDrawer.destroy?.(map)
  if (map) {
    try {
      map.destroy()
    } catch (e) {
      /* ignore */
    }
  }
  map = null
  mapReady.value = false
  hasFittedView = false
}

function initMap() {
  if (typeof window.AMap === 'undefined') {
    ElMessage.error('地图 SDK 未加载，请刷新重试')
    return
  }
  const farm = farmStore.selectFarm || farmStore.s_selectFarm
  const center =
    farm?.longitude != null && farm?.latitude != null
      ? [Number(farm.longitude), Number(farm.latitude)]
      : [116.397428, 39.90923]

  window.AMap.plugin(['AMap.GeometryUtil'], () => {
    map = new window.AMap.Map('group-detail-map', {
      zoom: 16,
      zooms: [3, 26],
      viewMode: '2D',
      layers: [new window.AMap.TileLayer.Satellite()],
      resizeEnable: true,
      center
    })
    map.on('complete', async () => {
      mapReady.value = true
      await loadFarmDevices()
      refreshMapFromDetail()
    })
  })
}

function startPoll() {
  clearPoll()
  pollTimer = setInterval(() => {
    // 对齐移动端 isModalShow：风险弹窗期间不轮询
    if (isModalShow.value) return
    fetchDetail({ silent: true })
  }, POLL_MS)
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  detailRequestId += 1
}

onMounted(async () => {
  const id = getGroupId()
  if (id == null) {
    ElMessage.warning('缺少轮灌组信息')
    router.replace('/irrigation-group')
    return
  }
  await fetchDetail({ showLoading: true, silent: false })
  await nextTick()
  initMap()
  startPoll()
  if (shouldResumeEditDialog()) {
    farmStore.setGroupDetailInfo(groupInfo.value)
    editVisible.value = true
  }
})

watch(recordVisible, (v) => {
  if (!v && activeSideAction.value === 'record') activeSideAction.value = ''
})
watch(timerListVisible, (v) => {
  if (!v && activeSideAction.value === 'timer') activeSideAction.value = ''
})
watch(avePressVisible, (v) => {
  if (!v && activeSideAction.value === 'avePress') activeSideAction.value = ''
})

onUnmounted(() => {
  clearPoll()
  clearRunTick()
  clearBatchLockTimer()
  destroyMap()
})
</script>

<style scoped>
.group-detail-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
  box-sizing: border-box;
  overflow: hidden;
}

.group-detail-page__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px 12px;
  background: #f7fafc;
}

.group-detail-page__head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.group-detail-page__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.group-detail-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-detail-page__edit {
  flex-shrink: 0;
  height: 40px;
  border-radius: 10px;
  background: #3653a0;
  border-color: #3653a0;
}

.group-detail-page__edit .iconfont {
  margin-right: 6px;
}

.group-detail-page__body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.group-detail-top {
  /* 相对可视区域保留原先地图区高度；出水桩增多时由 body 整体滚动 */
  flex: none;
  height: calc(100% - 274px);
  min-height: 360px;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 16px;
  align-items: stretch;
}

.group-detail-map-card {
  position: relative;
  height: 100%;
  min-height: 0;
  border-radius: 16px;
  overflow: hidden;
  background: #e5e7eb;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
}

.group-detail-map-card__map {
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* 隐藏高德地图左下角 Logo / 版权 */
.group-detail-map-card :deep(.amap-logo),
.group-detail-map-card :deep(.amap-copyright),
.group-detail-map-card :deep(.amap-mcode) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* 对齐移动端：左下角能手地图标志 */
.group-detail-map-brand {
  position: absolute;
  left: 8px;
  bottom: 12px;
  z-index: 9;
  display: flex;
  align-items: center;
  pointer-events: none;
  user-select: none;
}

.group-detail-map-brand__img {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  object-fit: contain;
  display: block;
}

.group-detail-map-brand__text {
  font-size: 12px;
  color: #fff;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
}

.group-detail-map-card__loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #909399;
}

.group-detail-map-card__area {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
}

.group-detail-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.group-detail-side__card {
  flex: 1;
  min-height: 0;
  padding: 18px 16px 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-detail-side__head {
  flex-shrink: 0;
}

.group-detail-side__name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.group-detail-side__runtime {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 4px;
  box-sizing: border-box;
}

.group-detail-side__runtime-empty {
  width: 100%;
  height: 100%;
  min-height: 120px;
}

.group-detail-side__run-ring {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.group-detail-side__run-disc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.group-detail-side__run-disc.is-rotate {
  animation: group-detail-run-spin 10s linear infinite;
}

.group-detail-side__run-ring-inner {
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

.group-detail-side__run-ring-inner span {
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-detail-side__run-ring-inner .iconfont {
  font-size: 26px;
  color: #606266;
  line-height: 1;
}

@keyframes group-detail-run-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.group-detail-side__runtime-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 28px;
}

.group-detail-side__stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.group-detail-side__stat.is-next {
  flex: 1;
  gap: 6px;
}

.group-detail-side__stat-label {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.2;
}

.group-detail-side__stat-date {
  font-size: 14px;
  color: #64748b;
  line-height: 1.3;
}

.group-detail-side__stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.15;
  word-break: break-all;
}

.group-detail-side__batch {
  flex-shrink: 0;
  height: 118px;
  padding: 0 20px;
  border-radius: 24px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
}

.group-detail-side__batch-label {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.group-detail-side__batch-btn {
  flex-shrink: 0;
  min-width: 128px;
  height: 48px;
  padding: 0 14px 0 8px;
  border: none;
  border-radius: 999px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  box-sizing: border-box;
}

.group-detail-side__batch-btn.is-close {
  background: #12b97e;
  box-shadow: 0 8px 18px rgba(18, 185, 126, 0.28);
}

.group-detail-side__batch-btn.is-open {
  background: #f24724;
  box-shadow: 0 8px 18px rgba(242, 71, 36, 0.28);
}

.group-detail-side__batch-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.group-detail-side__batch-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}

.group-detail-side__batch-btn.is-close .group-detail-side__batch-badge {
  color: #12b97e;
}

.group-detail-side__batch-btn.is-open .group-detail-side__batch-badge {
  color: #f24724;
}

.group-detail-side__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.group-detail-side__action {
  height: 56px;
  padding: 0 12px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  box-sizing: border-box;
  transition: background 0.2s ease, color 0.2s ease;
}

.group-detail-side__action-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: block;
  object-fit: contain;
}

.group-detail-side__action span {
  line-height: 1.2;
}

.group-detail-side__action:hover {
  background: rgba(255, 255, 255, 0.95);
}

.group-detail-side__action.is-active {
  background: #3653a0;
  color: #fff;
}

.group-detail-side__action.is-active:hover {
  background: #3653a0;
  color: #fff;
}

.group-detail-outlets {
  flex: none;
  height: auto;
  min-height: 0;
  max-height: none;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.group-detail-outlets__title {
  flex-shrink: 0;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.group-detail-outlets__empty {
  padding: 40px;
  text-align: center;
  color: #909399;
  font-size: 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
}

.group-detail-outlets__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  overflow: visible;
  align-content: start;
  box-sizing: border-box;
}

.outlet-card {
  padding: 14px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.outlet-card.is-offline {
  /* 对齐移动端 device-offline-gray-noclick */
  filter: grayscale(100%);
  opacity: 0.65;
  pointer-events: none;
}

.outlet-card.is-offline * {
  pointer-events: none !important;
}

.outlet-card__top {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.outlet-card__top-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.outlet-card__top-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-shrink: 0;
  padding-top: 2px;
}

.outlet-card__alarm {
  font-size: 14px;
  color: #ef4444;
  line-height: 1;
}

.outlet-card__manual {
  font-size: 14px;
  color: #ef4444;
  line-height: 1;
}

.outlet-card__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.outlet-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.outlet-card__status.is-online {
  background: #e8f8ef;
  color: #00a85a;
}

.outlet-card__status.is-online .outlet-card__status-dot {
  background: #00a85a;
}

.outlet-card__status.is-offline {
  background: #f0f2f5;
  color: #909399;
}

.outlet-card__status.is-offline .outlet-card__status-dot {
  background: #909399;
}

.outlet-card__battery {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #00a85a;
  line-height: 1;
}

.outlet-card__battery.is-low {
  color: #f56c6c;
}

.outlet-card__battery .iconfont {
  display: inline-block;
  font-size: 14px;
  line-height: 1;
  transform: rotate(90deg);
}

.outlet-card__name {
  max-width: 100%;
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outlet-card__img {
  margin-top: 2px;
  width: 108px;
  height: 108px;
  object-fit: contain;
}

.outlet-card__ports {
  margin-top: 12px;
  width: calc(100% - 50px);
  display: flex;
  gap: 8px;
}

.outlet-card__port {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 17px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 0 6px;
}

.outlet-card__port.is-open {
  background: #00c970;
}

.outlet-card__port.is-close {
  background: #ff2f30;
}

.outlet-card__port:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.outlet-card__port.is-blink {
  animation: outlet-blink 1s ease-in-out infinite;
}

.outlet-card__port-badge {
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #fff;
  color: #303133;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

@keyframes outlet-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (max-width: 1400px) {
  .group-detail-outlets__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .group-detail-top {
    grid-template-columns: 1fr;
  }
  .group-detail-outlets__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
