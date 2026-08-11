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
          <div v-if="areaLabel" class="group-detail-map-card__area">
            圈地面积：{{ areaLabel }}
          </div>
        </div>

        <aside class="group-detail-side">
          <div class="group-detail-side__card">
            <div class="group-detail-side__head">
              <h2 class="group-detail-side__name">{{ displayName }}</h2>
              <div class="group-detail-side__sync-row">
                <span class="group-detail-side__sync-time">
                  同步时间：{{ syncTimeText }}
                </span>
                <button
                  type="button"
                  class="group-detail-side__sync-btn"
                  :disabled="syncing"
                  @click="onSync(true)"
                >
                  立即同步
                </button>
              </div>
            </div>

            <div v-if="showRuntimeBanner" class="group-detail-side__runtime">
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
                    <span class="group-detail-side__stat-value">
                      {{ nextRunDateText }}
                      <strong v-if="nextRunClockText">{{ nextRunClockText }}</strong>
                    </span>
                  </div>
                </template>
              </div>
            </div>

            <div class="group-detail-side__batch">
              <div class="group-detail-side__batch-label">
                <div>全部出水口</div>
                <div class="group-detail-side__batch-sub">
                  当前共有 {{ outletPileCount }} 个出水桩
                </div>
              </div>
              <button
                type="button"
                class="group-detail-side__batch-btn"
                :class="batchIsClose ? 'is-close' : 'is-open'"
                :disabled="batchLoading || !groupInfo?.id || isBatchLocked"
                @click="onBatchToggle"
              >
                <template v-if="batchIsClose">
                  <span>批量关</span>
                  <span class="group-detail-side__batch-badge">{{ portCountText }}</span>
                </template>
                <template v-else>
                  <span class="group-detail-side__batch-badge">{{ portCountText }}</span>
                  <span>批量开</span>
                </template>
              </button>
            </div>
          </div>

          <div class="group-detail-side__actions">
            <button type="button" class="group-detail-side__action" @click="onRecord">
              <i class="iconfont icon-device_ic_calendar"></i>
              <span>记录</span>
            </button>
            <button type="button" class="group-detail-side__action" @click="onTimer">
              <i class="iconfont icon-home_ic_foot_program_01"></i>
              <span>定时控制</span>
            </button>
            <button type="button" class="group-detail-side__action" @click="onAvePress">
              <i class="iconfont icon-group_ic_pressure"></i>
              <span>一键均压</span>
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
              <span
                class="outlet-card__status"
                :class="pile.isOnline ? 'is-online' : 'is-offline'"
              >
                <i class="outlet-card__status-dot"></i>
                {{ getOnlineText(pile) }}
              </span>
              <div class="outlet-card__top-right">
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
            <div class="outlet-card__name">{{ pile.name || '出水桩' }}</div>
            <img class="outlet-card__img" :src="outletImg" alt="" />
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
  </div>
</template>

<script setup>
/**
 * 轮灌组详情（PC）
 * 对齐移动端 map-group-detail + control-group
 * 布局：左上地图 / 右侧程序信息与操作 / 下方关联出水桩
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getFarmInfo } from '@/api/map'
import {
  closeAllWaterDv,
  getGroupDetail,
  openAllWaterDv
} from '@/api/irrigationGroup'
import { closeWaterDv, openWaterDv } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import { useAlarmStore } from '@/store/alarm'
import { parseAreaJson } from '@/utils/farmMapData'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import { createWaterDvMarkerDrawer } from '@/utils/farmMapWaterDv'
import outletImg from '@/assets/device/add/device_img_outl.png'
import runningDiscImg from '@/assets/device/device_img_running.png'
import SwitchRecordDialog from './SwitchRecordDialog.vue'
import TimerProListDialog from './TimerProListDialog.vue'
import AvePressDialog from './AvePressDialog.vue'

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

let map = null
let farmDevices = []
let pollTimer = null
let runTickTimer = null
let detailRequestId = 0
let lockUntil = 0
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

const outletPileCount = computed(() => outletPiles.value.length)

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

const isBatchLocked = computed(() => lockUntil > Date.now())

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
  if (src.tiggerObject == 2 || src.tiggerObject == 3) return '自动轮灌'
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
  if (src.tiggerObject == 2 || src.tiggerObject == 3) return 'icon-home_ic_foot_program_01'
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

const nextRunText = computed(
  () =>
    formatUtc(groupInfo.value?.deviceNexRunTime?.nextRunTime, 'cn') || '--'
)

const nextRunDateText = computed(() => {
  const t = groupInfo.value?.deviceNexRunTime?.nextRunTime
  if (!t) return '--'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return nextRunText.value
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${y}-${m}-${day}`
})

const nextRunClockText = computed(() => {
  const t = groupInfo.value?.deviceNexRunTime?.nextRunTime
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ''
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

function getOnlineText(pile) {
  if (pile?.isOnline) return '在线运行'
  const ds = Number(pile?.ds)
  const map = {
    1: '定时关机',
    2: '低温关机',
    3: '低电量关机',
    4: '本地关机',
    5: '远程关机',
    9: '手动态'
  }
  return map[ds] || '离线状态'
}

function normalizePorts(info) {
  const piles = Array.isArray(info?.outletPiles) ? info.outletPiles : []
  piles.forEach((pile) => {
    const ports = pile.waterOutletPile?.ports || []
    ports.forEach((port) => {
      if (port.isOpen == null) {
        port.isOpen = Number(port.currentOpening) > 0
      }
    })
  })
  return info
}

function mergeDetailKeepControl(newInfo) {
  if (!newInfo) return null
  const next = normalizePorts({ ...newInfo })
  const piles = next.outletPiles || []
  piles.forEach((pile) => {
    const waterOut = pile.waterOutletPile
    if (!waterOut?.id) return
    const cached = controlWaterOutletList[waterOut.id]
    if (!cached) return
    // 动作未结束：保留本地 isOpen / valveAction 乐观态，只同步开度数值
    if (Number(waterOut.valveAction) !== 0) {
      waterOut.valveAction = cached.valveAction
      ;(waterOut.ports || []).forEach((port) => {
        const oldPort = (cached.ports || []).find(
          (p) => Number(p.outletNo) === Number(port.outletNo)
        )
        if (oldPort && oldPort.isOpen != null) port.isOpen = oldPort.isOpen
      })
      return
    }
    // 动作结束：清缓存，采用服务端
    delete controlWaterOutletList[waterOut.id]
  })
  return next
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
    const data = mergeDetailKeepControl(res?.data || null)
    groupInfo.value = data
    farmStore.setGroupDetailInfo(data)
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

function setBatchLock(isClose) {
  lockUntil = Date.now() + LOCK_SECONDS * 1000
  batchSwitchLocked.value = isClose
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
      try {
        await ElMessageBox.confirm(
          `${e?.message || '关闭失败'}，是否强制关闭？`,
          '提示',
          {
            confirmButtonText: '强制关闭',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        await closeAllWaterDv({ id, force: true }, { silent: true })
        ElMessage.success('操作成功')
        setBatchLock(false)
        await fetchDetail({ silent: true })
        return
      } catch {
        lockUntil = 0
        batchSwitchLocked.value = prevClose
      }
    } else {
      lockUntil = 0
      batchSwitchLocked.value = prevClose
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
      ElMessage.warning('当前设备处于手动状态，只能现场操作')
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
            opening: port.defaultOpening ?? 30
          }
        ]
      },
      { silent: true }
    )
    ElMessage.success('操作成功')
    await fetchDetail({ silent: true })
  } catch (e) {
    if (e?.code === 40102 && !force) {
      try {
        await ElMessageBox.confirm(
          '强制打开可能有爆管风险，是否强制打开？',
          '提示',
          {
            confirmButtonText: '强制打开',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        await openPortHttp(waterOut, port, true)
        return
      } catch {
        delete controlWaterOutletList[waterOut.id]
        await fetchDetail({ silent: true })
        return
      }
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
      try {
        await ElMessageBox.confirm(
          `${e?.message || '关闭失败'}，是否强制关闭？`,
          '提示',
          {
            confirmButtonText: '强制关闭',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        await closePortHttp(waterOut, port, true)
        return
      } catch {
        delete controlWaterOutletList[waterOut.id]
        await fetchDetail({ silent: true })
        return
      }
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
  router.push({ path: '/irrigation-group/edit', query: { type: 'edit' } })
}

function onRecord() {
  if (!groupInfo.value?.id) {
    ElMessage.warning('请先加载轮灌组详情')
    return
  }
  farmStore.setGroupDetailInfo(groupInfo.value)
  recordVisible.value = true
}

function onTimer() {
  if (!groupInfo.value?.id) {
    ElMessage.warning('请先加载轮灌组详情')
    return
  }
  farmStore.setGroupDetailInfo(groupInfo.value)
  timerListVisible.value = true
}

function onAvePress() {
  if (!groupInfo.value?.id) {
    ElMessage.warning('请先加载轮灌组详情')
    return
  }
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
    readOnly: true
  })
  waterDvMarkerDrawer.drawAllWaterDvMarker(map, devices, { layerOptions })

  const overlays = [
    ...(landPolygonDrawer.landPolygonList || []),
    ...(waterDvMarkerDrawer.waterDvMarkers || [])
  ]
  if (overlays.length) {
    try {
      map.setFitView(overlays, false, [40, 40, 40, 40])
    } catch (e) {
      /* ignore */
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
})

onUnmounted(() => {
  clearPoll()
  clearRunTick()
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
  overflow: hidden;
  padding: 0 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-detail-top {
  flex: 1;
  min-height: 0;
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
  padding: 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
}

.group-detail-side__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f7;
}

.group-detail-side__name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.group-detail-side__sync-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.group-detail-side__sync-time {
  font-size: 12px;
  color: #909399;
}

.group-detail-side__sync-btn {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: #3653a0;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  line-height: 28px;
}

.group-detail-side__sync-btn:hover:not(:disabled) {
  background: #2f4a90;
}

.group-detail-side__sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.group-detail-side__runtime {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 16px;
  padding: 19px 12px;
  min-height: 111px;
  box-sizing: border-box;
  border-radius: 12px;
  background: #f7fafc;
}

.group-detail-side__run-ring {
  position: relative;
  width: 120px;
  height: 120px;
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
  gap: 24px;
}

.group-detail-side__stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-detail-side__stat.is-next {
  flex: 1;
}

.group-detail-side__stat-label {
  font-size: 13px;
  color: #909399;
}

.group-detail-side__stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1.2;
}

.group-detail-side__stat-value strong {
  margin-left: 8px;
  font-size: 32px;
  font-weight: 700;
}

.group-detail-side__batch {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.group-detail-side__batch-label {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.group-detail-side__batch-sub {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.group-detail-side__batch-btn {
  flex-shrink: 0;
  min-width: 108px;
  height: 36px;
  border: none;
  border-radius: 18px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.group-detail-side__batch-btn.is-close {
  background: #00c970;
  padding: 0 4px 0 12px;
}

.group-detail-side__batch-btn.is-open {
  background: #ff2f30;
  padding: 0 12px 0 4px;
}

.group-detail-side__batch-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.group-detail-side__batch-badge {
  min-width: 32px;
  height: 26px;
  padding: 0 8px;
  border-radius: 13px;
  background: #fff;
  color: #303133;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.group-detail-side__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.group-detail-side__action {
  height: 56px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  cursor: pointer;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
}

.group-detail-side__action .iconfont {
  flex-shrink: 0;
  font-size: 22px;
  color: #3653a0;
  line-height: 1;
}

.group-detail-side__action span {
  line-height: 1.2;
}

.group-detail-side__action:hover {
  background: #f5f7fa;
}

.group-detail-outlets {
  flex-shrink: 0;
  height: 258px;
  min-height: 258px;
  max-height: 258px;
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
  flex: 1;
  min-height: 0;
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
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  align-content: start;
  padding-right: 4px;
  box-sizing: border-box;
}

.group-detail-outlets__grid::-webkit-scrollbar {
  width: 6px;
}

.group-detail-outlets__grid::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: rgba(54, 83, 160, 0.25);
}

.group-detail-outlets__grid::-webkit-scrollbar-track {
  background: transparent;
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
  filter: grayscale(0.85);
  opacity: 0.85;
}

.outlet-card__top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.outlet-card__top-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-shrink: 0;
}

.outlet-card__alarm {
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
  font-size: 14px;
  line-height: 1;
}

.outlet-card__name {
  margin-top: 8px;
  width: 100%;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outlet-card__img {
  margin-top: 10px;
  width: 88px;
  height: 88px;
  object-fit: contain;
}

.outlet-card__ports {
  margin-top: 12px;
  width: 100%;
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
