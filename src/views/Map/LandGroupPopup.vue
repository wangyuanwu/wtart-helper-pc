<template>
  <div
    v-if="visible"
    class="land-group-popup"
    @click.stop
    @mousedown.stop
  >
    <div class="land-group-popup__top">
      <div class="land-group-popup__top-main">
        <div class="land-group-popup__header">
          <div class="land-group-popup__title-row">
            <h3 class="land-group-popup__title">{{ displayName }}</h3>
            <button
              type="button"
              class="land-group-popup__link"
              @click="onViewDetail"
            >
              查看详情 &gt;
            </button>
          </div>
        </div>

        <div class="land-group-popup__meta">
          <span class="land-group-popup__meta-item">
            <i class="iconfont icon-map_ic_land"></i>
            面积 {{ areaText }}亩
          </span>
          <span class="land-group-popup__meta-item">
            <el-icon class="land-group-popup__sync-icon"><Refresh /></el-icon>
            同步: {{ syncTimeText }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="land-group-popup__sync"
        :disabled="syncing"
        @click="onSync(true)"
      >
        <el-icon class="land-group-popup__sync-btn-icon"><RefreshRight /></el-icon>
        立即同步
      </button>

      <button
        type="button"
        class="land-group-popup__close"
        title="关闭"
        @click="onClose"
      >
        <i class="iconfont icon-shanchu"></i>
      </button>
    </div>

    <div v-if="loading && !groupDetail" class="land-group-popup__loading">
      加载中...
    </div>

    <template v-else>
      <div class="land-group-popup__actions">
        <button
          type="button"
          class="land-group-popup__batch"
          :class="batchIsClose ? 'is-close' : 'is-open'"
          :disabled="batchLoading || !groupDetail?.id"
          @click="onBatchToggle"
        >
          <span class="land-group-popup__batch-label">
            {{ batchIsClose ? '批量关' : '批量开' }}
          </span>
          <span class="land-group-popup__batch-badge">{{ portCountText }}</span>
        </button>
      </div>

      <div class="land-group-popup__stats">
        <template v-for="(item, idx) in infoItems" :key="item.key">
          <div
            v-if="idx > 0"
            class="land-group-popup__stat-divider"
            aria-hidden="true"
          ></div>
          <div class="land-group-popup__stat">
            <div class="land-group-popup__stat-label">{{ item.label }}</div>
            <div
              class="land-group-popup__stat-value"
              :class="{ 'is-accent': item.accent }"
            >
              {{ item.value }}
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, RefreshRight } from '@element-plus/icons-vue'
import {
  closeAllWaterDv,
  getGroupDetail,
  openAllWaterDv
} from '@/api/irrigationGroup'
import { useFarmStore } from '@/store/farm'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 点击的轮灌组（至少含 id / name） */
  group: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'close'])

const router = useRouter()
const farmStore = useFarmStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const groupDetail = ref(null)
const loading = ref(false)
const syncing = ref(false)
const batchLoading = ref(false)
const syncTimeText = ref('--')
const openPortCount = ref(0)
const totalPortCount = ref(0)
/** 本地灌溉时长刷新 */
const runTick = ref(0)

let detailPollTimer = null
let runTickTimer = null
let detailRequestId = 0

const GROUP_DETAIL_POLL_MS = 3000
/** 批量操作后锁定秒数（对齐移动端 lockTime: 10） */
const BATCH_LOCK_SECONDS = 10
/** 计入「已打开」端口的 valveAction（对齐移动端 pop_group_info） */
const OPEN_VALVE_ACTIONS = [0, 1, 3, 5, 7, 9, 11, 13]

let lockUntil = 0
/** 操作锁期间保持批量按钮方向，避免轮询覆盖 */
const batchSwitchLocked = ref(null)

const displayName = computed(
  () => groupDetail.value?.name || props.group?.name || '未命名轮灌组'
)

/** 面积：详情优先，与移动端一致按亩展示 */
const areaText = computed(() => {
  const area = groupDetail.value?.area ?? props.group?.areaMu ?? props.group?.area
  if (area == null || area === '') return '0.00'
  const num = Number(area)
  return Number.isFinite(num) ? num.toFixed(2) : '0.00'
})

const portCountText = computed(
  () => `${openPortCount.value}/${totalPortCount.value}`
)

/** true=当前应显示「批量关」（有开度或运行中）；锁定期内保持用户操作方向 */
const batchIsClose = computed(() => {
  if (lockUntil > Date.now() && batchSwitchLocked.value != null) {
    return batchSwitchLocked.value
  }
  const running = !!groupDetail.value?.deviceRuntime?.isRunning
  return openPortCount.value > 0 || running
})

const isAutoIrrigation = (tiggerObject) =>
  tiggerObject == 2 || tiggerObject == 3

const pad2 = (n) => String(n).padStart(2, '0')

const formatNowHms = () => {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

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
  if (fmt === 'hms') return `${h}:${mi}:${s}`
  if (fmt === 'mdhm') return `${m}月${day}日 ${h}:${mi}`
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}

const calcRunTime = (startUtc) => {
  void runTick.value
  if (!startUtc) return '--:--'
  const start = new Date(startUtc).getTime()
  if (Number.isNaN(start)) return '--:--'
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

/**
 * 启动方式文案（对齐移动端 pop_group_info getRunText；PC 文案按设计稿）
 */
const getRunText = (item) => {
  if (!item) return '--'
  const pick = (src) => {
    if (!src) return null
    const tiggerObject = src.tiggerObject
    const mode = src.mode
    if (isAutoIrrigation(tiggerObject)) return '自动轮灌'
    if (mode == 0) return '手动启动'
    if (mode == 1) return '定时启动'
    return null
  }

  if (item.deviceRuntime != null) {
    if (item.deviceRuntime.isRunning) {
      return pick(item.deviceRuntime) || '--'
    }
    if (item.deviceNexRunTime != null) {
      return pick(item.deviceNexRunTime) || '--'
    }
  } else if (item.deviceNexRunTime != null) {
    return pick(item.deviceNexRunTime) || '--'
  }
  return '--'
}

const resolveTiggerObject = (detail) =>
  detail?.tiggerObject ??
  detail?.deviceRuntime?.tiggerObject ??
  detail?.deviceNexRunTime?.tiggerObject

const resolveProgramName = (detail) =>
  detail?.programName ?? detail?.deviceRuntime?.programName ?? ''

/**
 * 底部信息栏：对齐移动端显隐 + PC 空态占位
 */
const infoItems = computed(() => {
  const detail = groupDetail.value
  if (!detail) {
    return [
      { key: 'next', label: '下次启动时间', value: '--:--', accent: false },
      { key: 'duration', label: '灌溉时长', value: '--:--', accent: true },
      { key: 'mode', label: '启动方式', value: '---', accent: false }
    ]
  }

  const hasNext = detail.deviceNexRunTime?.nextRunTime != null
  const isRunning = !!detail.deviceRuntime?.isRunning
  const hasRuntimeOrNext = !!(detail.deviceRuntime || detail.deviceNexRunTime)
  const isIdle = !detail.deviceRuntime && !detail.deviceNexRunTime
  const tiggerObject = resolveTiggerObject(detail)
  const programName = resolveProgramName(detail)
  const items = []

  if (isIdle) {
    items.push(
      { key: 'next', label: '下次启动时间', value: '--:--', accent: false },
      { key: 'duration', label: '灌溉时长', value: '--:--', accent: true },
      { key: 'mode', label: '启动方式', value: '---', accent: false }
    )
    return items
  }

  if (hasNext) {
    items.push({
      key: 'next',
      label: '下次启动时间',
      value: formatUtc(detail.deviceNexRunTime.nextRunTime, 'mdhm') || '--:--',
      accent: true
    })
  }

  if (isRunning && openPortCount.value > 0) {
    items.push({
      key: 'duration',
      label: '灌溉时长',
      value: calcRunTime(detail.deviceRuntime?.startTime),
      accent: true
    })
  }

  if (hasRuntimeOrNext) {
    items.push({
      key: 'mode',
      label: '启动方式',
      value: getRunText(detail),
      accent: false
    })
  }

  if (isAutoIrrigation(tiggerObject) && programName) {
    items.push({
      key: 'program',
      label: '轮灌程序',
      value: programName,
      accent: false
    })
  }

  if (!items.length) {
    items.push({
      key: 'mode',
      label: '启动方式',
      value: '--',
      accent: false
    })
  }

  return items
})

const isPortCountAsOpen = (pile, port) => {
  if (Number(port?.currentOpening) <= 0) return false
  const valveAction = pile?.waterOutletPile?.valveAction
  if (valveAction == null) return true
  return OPEN_VALVE_ACTIONS.includes(valveAction)
}

const applyPortStats = (detail) => {
  let total = 0
  let open = 0
  const pileList = detail?.outletPiles || []
  pileList.forEach((pile) => {
    const ports = pile?.waterOutletPile?.ports || []
    ports.forEach((port) => {
      total += 1
      if (isPortCountAsOpen(pile, port)) open += 1
    })
  })
  totalPortCount.value = total
  openPortCount.value = open
}

const clearBatchLock = () => {
  lockUntil = 0
  batchSwitchLocked.value = null
}

const setBatchLock = (switchClose) => {
  lockUntil = Date.now() + BATCH_LOCK_SECONDS * 1000
  batchSwitchLocked.value = switchClose
}

const clearDetailPoll = () => {
  if (detailPollTimer) {
    clearInterval(detailPollTimer)
    detailPollTimer = null
  }
  detailRequestId += 1
}

const clearRunTick = () => {
  if (runTickTimer) {
    clearInterval(runTickTimer)
    runTickTimer = null
  }
}

const ensureRunTick = () => {
  clearRunTick()
  if (!groupDetail.value?.deviceRuntime?.isRunning) return
  runTickTimer = setInterval(() => {
    runTick.value += 1
  }, 1000)
}

const fetchGroupDetail = async ({ showLoading = false, silent = true } = {}) => {
  const id = props.group?.id
  if (id == null) return

  const requestId = ++detailRequestId
  if (showLoading && !groupDetail.value) loading.value = true
  if (showLoading) syncing.value = true

  try {
    const res = await getGroupDetail(id, { silent })
    if (requestId !== detailRequestId) return
    groupDetail.value = res?.data || null
    applyPortStats(groupDetail.value)
    syncTimeText.value = formatNowHms()
    // 端口数始终更新；锁定期结束后恢复由接口驱动的批量按钮方向
    if (!(lockUntil > Date.now())) {
      batchSwitchLocked.value = null
    }
    ensureRunTick()
  } catch (e) {
    if (requestId !== detailRequestId) return
    console.error('[Map] 获取轮灌组详情失败', e)
  } finally {
    if (requestId === detailRequestId) {
      loading.value = false
      syncing.value = false
    }
  }
}

const startDetailPoll = () => {
  clearDetailPoll()
  fetchGroupDetail({ showLoading: true, silent: false })
  detailPollTimer = setInterval(() => {
    if (visible.value && props.group?.id != null) {
      fetchGroupDetail({ silent: true })
    }
  }, GROUP_DETAIL_POLL_MS)
}

const onSync = (manual = true) => {
  fetchGroupDetail({ showLoading: manual, silent: !manual })
}

const onBatchToggle = async () => {
  const id = groupDetail.value?.id || props.group?.id
  if (id == null || batchLoading.value) return
  if (lockUntil > Date.now()) return

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
    await fetchGroupDetail({ silent: true })
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
        setBatchLock(false)
        await closeAllWaterDv({ id, force: true }, { silent: true })
        ElMessage.success('操作成功')
        setBatchLock(false)
        await fetchGroupDetail({ silent: true })
        return
      } catch {
        clearBatchLock()
        batchSwitchLocked.value = prevClose
      }
    } else {
      clearBatchLock()
      batchSwitchLocked.value = prevClose
      console.error('[Map] 轮灌组批量开关失败', e)
    }
  } finally {
    batchLoading.value = false
  }
}

const onClose = () => {
  visible.value = false
  emit('close')
}

/** 对齐移动端 toGroupControl → map-group-detail / 轮灌组列表 onGroupClick */
const onViewDetail = () => {
  const id = groupDetail.value?.id ?? props.group?.id
  if (id == null) {
    ElMessage.warning('缺少轮灌组信息')
    return
  }
  const item = groupDetail.value || props.group
  farmStore.setGroupListItem(item ? { ...item } : { id })
  onClose()
  router.push({
    path: '/irrigation-group/detail',
    query: { id: String(id) }
  })
}

const resetState = () => {
  clearDetailPoll()
  clearRunTick()
  clearBatchLock()
  groupDetail.value = null
  loading.value = false
  syncing.value = false
  batchLoading.value = false
  syncTimeText.value = '--'
  openPortCount.value = 0
  totalPortCount.value = 0
  runTick.value = 0
}

watch(
  () => [props.modelValue, props.group?.id],
  ([open, id], prev = []) => {
    const prevId = prev?.[1]
    if (open && id != null) {
      if (String(id) !== String(prevId ?? '')) {
        groupDetail.value = null
        syncTimeText.value = '--'
        openPortCount.value = 0
        totalPortCount.value = 0
        clearBatchLock()
      }
      startDetailPoll()
    } else {
      resetState()
    }
  }
)

onUnmounted(() => {
  resetState()
})

defineExpose({
  refresh: () => fetchGroupDetail({ silent: true }),
  groupDetail
})
</script>

<style scoped>
.land-group-popup {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1200;
  width: 380px;
  height: 276px;
  box-sizing: border-box;
  padding: 16px 16px 12px;
  border-radius: 12px;
  background: rgba(245, 246, 248, 0.94);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.land-group-popup__top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  position: relative;
  padding-right: 18px;
}

.land-group-popup__top-main {
  flex: 1;
  min-width: 0;
}

.land-group-popup__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.land-group-popup__title-row {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 8px;
}

.land-group-popup__title {
  margin: 0;
  min-width: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  word-break: break-all;
}

.land-group-popup__link {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #2f6bff;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.land-group-popup__close {
  position: absolute;
  top: -2px;
  right: -2px;
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.land-group-popup__close .iconfont {
  font-size: 18px;
}

.land-group-popup__close:hover {
  color: #909399;
}

.land-group-popup__meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  font-size: 13px;
  color: #909399;
}

.land-group-popup__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.land-group-popup__meta-item .land-group-popup__sync-icon {
  color: #2f6bff;
  font-size: 14px;
}

.land-group-popup__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.land-group-popup__actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.land-group-popup__sync {
  width: 100px;
  height: 38.9px;
  padding: 0 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
  border: 0.9px solid rgba(54, 83, 160, 0.2);
  color: #3653a0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
}

.land-group-popup__sync:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.9);
}

.land-group-popup__sync:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.land-group-popup__sync .land-group-popup__sync-btn-icon {
  font-size: 14px;
  color: #3653a0;
}

.land-group-popup__batch {
  position: relative;
  width: 150px;
  max-width: 100%;
  height: 38px;
  border-radius: 37px;
  opacity: 1;
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 12px;
}

.land-group-popup__batch.is-close {
  background: #22c55e;
}

.land-group-popup__batch.is-close:hover:not(:disabled) {
  background: #16a34a;
}

.land-group-popup__batch.is-open {
  background: #f56c6c;
}

.land-group-popup__batch.is-open:hover:not(:disabled) {
  background: #e85c5c;
}

.land-group-popup__batch:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.land-group-popup__batch-label {
  position: relative;
  z-index: 1;
  line-height: 1;
  text-align: center;
}

.land-group-popup__batch-badge {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  min-width: 36px;
  height: 28px;
  padding: 0 8px;
  border-radius: 14px;
  background: #fff;
  color: #303133;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
  z-index: 1;
}

.land-group-popup__batch.is-open .land-group-popup__batch-badge {
  left: 4px;
}

.land-group-popup__batch.is-close .land-group-popup__batch-badge {
  right: 4px;
}

.land-group-popup__stats {
  margin-top: 14px;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 12px 0 4px;
  border-top: 1px solid #e4e7ed;
  background: transparent;
}

.land-group-popup__stat {
  flex: 1;
  min-width: 0;
  text-align: center;
  padding: 0 6px;
}

.land-group-popup__stat-divider {
  width: 1px;
  background: #ebeef5;
  margin: 4px 0;
  flex-shrink: 0;
  align-self: stretch;
}

.land-group-popup__stat-label {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.land-group-popup__stat-value {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  word-break: break-all;
}

.land-group-popup__stat-value.is-accent {
  color: #2f6bff;
}
</style>
