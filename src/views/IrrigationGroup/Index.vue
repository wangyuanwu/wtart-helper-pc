<template>
  <div class="group-page">
    <!-- 空态 -->
    <div v-if="showEmpty" class="group-empty">
      <img
        class="group-empty__img"
        src="@/assets/irrigation-group/group-empty.png"
        alt=""
      />
      <p class="group-empty__text">嗨！您还没有轮灌组</p>
      <button type="button" class="group-empty__btn" @click="onAddGroup">
        添加轮灌组
      </button>
    </div>

    <!-- 有数据 -->
    <template v-else-if="groupList != null">
      <div class="group-toolbar">
        <el-radio-group
          v-model="tabIndex"
          class="group-tabs"
          @change="onChangeTab"
        >
          <el-radio-button
            v-for="(tab, idx) in tabList"
            :key="tab.key"
            :value="idx"
          >
            {{ tab.label }}
          </el-radio-button>
        </el-radio-group>
        <el-button
          type="primary"
          class="group-toolbar__add"
          @click="onAddGroup"
        >
          <span class="group-toolbar__add-icon">+</span>
          添加轮灌组
        </el-button>
      </div>

      <div class="group-scroll">
        <div class="group-grid">
          <article
            v-for="item in filterGroupList"
            :key="item.id"
            class="group-card"
            @click="onGroupClick(item)"
          >
            <div class="group-card__header">
              <div class="group-card__title-wrap">
                <h3 class="group-card__name">{{ item.name || '未命名轮灌组' }}</h3>
                <p class="group-card__area">
                  面积: {{ formatArea(item.area) }} 亩
                </p>
              </div>
              <button
                type="button"
                class="group-card__batch"
                :class="item.localSwitch ? 'is-close' : 'is-open'"
                :disabled="isBatchLocked(item)"
                @click.stop="onBatchToggle(item)"
              >
                <template v-if="item.localSwitch">
                  <span>{{ item.localPercent }}</span>
                  <span class="group-card__batch-badge">{{ item.localLetter }}</span>
                </template>
                <template v-else>
                  <span class="group-card__batch-badge">{{ item.localLetter }}</span>
                  <span>{{ item.localPercent }}</span>
                </template>
              </button>
            </div>

            <div
              v-if="isScheduleEmpty(item)"
              class="group-card__schedule-empty"
            >
              <i class="iconfont icon-device_ic_calendar group-card__schedule-icon"></i>
              <span>暂无排期任务</span>
            </div>

            <div v-else class="group-card__stats">
              <div
                v-if="showNextRun(item)"
                class="group-card__stat"
              >
                <div class="group-card__stat-label">下次启动时间</div>
                <div class="group-card__stat-value is-accent">
                  {{ formatNextRun(item) }}
                </div>
              </div>
              <div
                v-if="showRunDuration(item)"
                class="group-card__stat"
              >
                <div class="group-card__stat-label">灌溉时长</div>
                <div class="group-card__stat-value is-accent">
                  {{ getRunTimeText(item) }}
                </div>
              </div>
              <div
                v-if="showProgram(item)"
                class="group-card__stat"
              >
                <div class="group-card__stat-label">轮灌组</div>
                <div class="group-card__stat-value">
                  {{ resolveProgramName(item) }}
                </div>
              </div>
              <div
                v-if="showModeStat(item)"
                class="group-card__stat"
              >
                <div class="group-card__stat-label">启动方式</div>
                <div class="group-card__stat-value">
                  {{ getRunText(item) }}
                </div>
              </div>
            </div>

            <div class="group-card__footer">
              <span class="group-card__footer-label">启动方式</span>
              <span class="group-card__footer-value">{{ getRunText(item) }}</span>
            </div>
          </article>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="group-loading">加载中...</div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import {
  closeAllWaterDv,
  getGroupList,
  openAllWaterDv
} from '@/api/irrigationGroup'

const farmStore = useFarmStore()

const groupList = ref(null)
const loading = ref(false)
const tabIndex = ref(0)
const runTick = ref(0)

const POLL_MS = 3000
const LOCK_SECONDS = 10
let pollTimer = null
let runTickTimer = null
let listRequestId = 0
let offFarmChange = null

const pad2 = (n) => String(n).padStart(2, '0')

const getFarmId = () =>
  farmStore.s_selectFarm?.id ??
  farmStore.selectFarm?.id ??
  farmStore.s_farm_info?.id ??
  null

const totalCount = computed(() => groupList.value?.length ?? 0)

const openedCount = computed(
  () =>
    (groupList.value || []).filter(
      (item) => item.deviceRuntime?.isRunning === true
    ).length
)

const closedCount = computed(
  () =>
    (groupList.value || []).filter(
      (item) => !(item.deviceRuntime?.isRunning === true)
    ).length
)

const tabList = computed(() => [
  { key: 'all', label: `全部(${totalCount.value})` },
  { key: 'opened', label: `已打开(${openedCount.value})` },
  { key: 'closed', label: `未打开(${closedCount.value})` }
])

const showEmpty = computed(() => {
  if (groupList.value == null) return false
  return totalCount.value <= 0
})

const filterGroupList = computed(() => {
  const list = groupList.value || []
  if (tabIndex.value === 0) return list
  if (tabIndex.value === 1) {
    return list.filter((item) => item.deviceRuntime?.isRunning === true)
  }
  return list.filter((item) => !(item.deviceRuntime?.isRunning === true))
})

const formatArea = (area) => {
  if (area == null || area === '') return '0.00'
  const num = Number(area)
  return Number.isFinite(num) ? num.toFixed(2) : '0.00'
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
  if (fmt === 'mdhm') return `${m}月${day}日 ${h}:${mi}`
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

const getRunTimeText = (item) => {
  if (!item.deviceRuntime?.startTime) return '--'
  const startTimeStr = formatUtc(item.deviceRuntime.startTime)
  return calcRunTime(startTimeStr)
}

const getRunText = (item) => {
  const pick = (src) => {
    if (!src) return null
    const tiggerObject = src.tiggerObject
    const mode = src.mode
    if (tiggerObject == 3) return '自动轮灌'
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

const resolveTiggerObject = (item) =>
  item?.tiggerObject ??
  item?.deviceRuntime?.tiggerObject ??
  item?.deviceNexRunTime?.tiggerObject

const resolveProgramName = (item) =>
  item?.programName ??
  item?.deviceRuntime?.programName ??
  '--'

const isScheduleEmpty = (item) =>
  !item.deviceRuntime && !item.deviceNexRunTime

const showNextRun = (item) =>
  item.deviceNexRunTime?.nextRunTime != null &&
  !(item.deviceRuntime?.isRunning && item.localSwitch)

const showRunDuration = (item) =>
  !!(item.deviceRuntime?.isRunning && item.localSwitch)

const showProgram = (item) =>
  resolveTiggerObject(item) == 3 && !!resolveProgramName(item) && resolveProgramName(item) !== '--'

const showModeStat = (item) => {
  if (isScheduleEmpty(item)) return false
  if (showNextRun(item) && showProgram(item)) return false
  if (showRunDuration(item) && showProgram(item)) return false
  return !!(item.deviceRuntime || item.deviceNexRunTime)
}

const formatNextRun = (item) =>
  formatUtc(item.deviceNexRunTime?.nextRunTime, 'mdhm') || '--'

const getStatus = (item) => !!(item.deviceRuntime && item.deviceRuntime.isRunning)

const getLetter = (item) =>
  `${item.portOpeningCnt ?? 0}/${item.protTotal ?? 0}`

const getPercent = (item) => (getStatus(item) ? '批量关' : '批量开')

const isBatchLocked = (item) => {
  const lockUntil = item.lockUntil
  return lockUntil != null && lockUntil > Date.now()
}

const mergeItemState = (newItem, oldItem) => {
  const now = Date.now()
  const isLocked = oldItem && oldItem.lockUntil && oldItem.lockUntil > now

  if (isLocked) {
    return {
      ...newItem,
      localSwitch: oldItem.localSwitch,
      localLetter: getLetter(newItem),
      localPercent: oldItem.localPercent,
      lockUntil: oldItem.lockUntil
    }
  }

  return {
    ...newItem,
    localSwitch: getStatus(newItem),
    localLetter: getLetter(newItem),
    localPercent: getPercent(newItem),
    lockUntil: 0
  }
}

const mergeGroupList = (oldList, newData) => {
  const next = [...(oldList || [])]
  newData.forEach((newItem) => {
    const oldIndex = next.findIndex((g) => String(g.id) === String(newItem.id))
    if (oldIndex > -1) {
      next[oldIndex] = mergeItemState(newItem, next[oldIndex])
    } else {
      next.push(mergeItemState(newItem, null))
    }
  })
  return next.filter((item) =>
    newData.some((n) => String(n.id) === String(item.id))
  )
}

const ensureRunTick = () => {
  if (runTickTimer) return
  const hasRunning = (groupList.value || []).some(
    (item) => item.deviceRuntime?.isRunning
  )
  if (!hasRunning) return
  runTickTimer = setInterval(() => {
    runTick.value += 1
    const stillRunning = (groupList.value || []).some(
      (item) => item.deviceRuntime?.isRunning
    )
    if (!stillRunning) {
      clearRunTick()
    }
  }, 1000)
}

const clearRunTick = () => {
  if (runTickTimer) {
    clearInterval(runTickTimer)
    runTickTimer = null
  }
}

const fetchGroupList = async ({ silent = false } = {}) => {
  const farmId = getFarmId()
  if (farmId == null) {
    groupList.value = []
    return
  }

  const requestId = ++listRequestId
  if (!silent && groupList.value == null) loading.value = true

  try {
    const res = await getGroupList(
      {
        farmId,
        searchText: ''
      },
      { silent }
    )
    if (requestId !== listRequestId) return

    const newData = Array.isArray(res?.data) ? res.data : []
    if (groupList.value == null || !silent) {
      groupList.value = newData.map((item) => mergeItemState(item, null))
    } else {
      groupList.value = mergeGroupList(groupList.value, newData)
    }
    ensureRunTick()
  } catch (e) {
    if (requestId !== listRequestId) return
    console.error('[IrrigationGroup] 获取轮灌组列表失败', e)
    if (groupList.value == null) groupList.value = []
  } finally {
    if (requestId === listRequestId) loading.value = false
  }
}

const openAllWaterDvHttp = async (order, waterId) => {
  try {
    const res = await openAllWaterDv(order)
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      const target = groupList.value?.find(
        (item) => String(item.id) === String(waterId)
      )
      if (target) {
        target.lockUntil = Date.now() + LOCK_SECONDS * 1000
      }
    } else {
      const target = groupList.value?.find(
        (item) => String(item.id) === String(waterId)
      )
      if (target) target.lockUntil = 0
      await fetchGroupList({ silent: true })
    }
  } catch (e) {
    const target = groupList.value?.find(
      (item) => String(item.id) === String(waterId)
    )
    if (target) target.lockUntil = 0
    await fetchGroupList({ silent: true })
    console.error('[IrrigationGroup] 批量开失败', e)
  }
}

const closeAllWaterDvHttp = async (closeOrder, waterId) => {
  try {
    const res = await closeAllWaterDv(closeOrder)
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      const target = groupList.value?.find(
        (item) => String(item.id) === String(waterId)
      )
      if (target) {
        target.lockUntil = Date.now() + LOCK_SECONDS * 1000
      }
    } else {
      const target = groupList.value?.find(
        (item) => String(item.id) === String(waterId)
      )
      if (target) target.lockUntil = 0
      await fetchGroupList({ silent: true })
    }
  } catch (e) {
    const target = groupList.value?.find(
      (item) => String(item.id) === String(waterId)
    )
    if (target) target.lockUntil = 0
    await fetchGroupList({ silent: true })
    console.error('[IrrigationGroup] 批量关失败', e)
  }
}

const onBatchToggle = (item) => {
  if (!item?.id || isBatchLocked(item)) return

  const nextSwitch = !item.localSwitch
  item.localSwitch = nextSwitch
  item.localPercent = nextSwitch ? '批量关' : '批量开'
  item.lockUntil = Date.now() + LOCK_SECONDS * 1000

  if (nextSwitch) {
    openAllWaterDvHttp(
      {
        groupId: item.id,
        openingType: 0
      },
      item.id
    )
  } else {
    closeAllWaterDvHttp({ id: item.id }, item.id)
  }
}

const onChangeTab = () => {}

const onAddGroup = () => {
  console.log('[IrrigationGroup] onAddGroup 预留出口')
  ElMessage.info('添加轮灌组功能开发中')
}

const onGroupClick = (item) => {
  console.log('[IrrigationGroup] onGroupClick 预留出口', item)
}

const clearPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  listRequestId += 1
}

const startPoll = () => {
  clearPoll()
  fetchGroupList({ silent: false })
  pollTimer = setInterval(() => {
    fetchGroupList({ silent: true })
  }, POLL_MS)
}

const handleFarmChange = () => {
  groupList.value = null
  tabIndex.value = 0
  clearRunTick()
  startPoll()
}

onMounted(() => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)
  startPoll()
})

onUnmounted(() => {
  offFarmChange?.()
  clearPoll()
  clearRunTick()
})
</script>

<style scoped>
.group-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #f7fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.group-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.group-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f7fafc;
  padding: 24px;
}

.group-empty__img {
  width: 160px;
  height: 160px;
  object-fit: contain;
}

.group-empty__text {
  margin: 20px 0 0;
  font-size: 15px;
  color: #909399;
  line-height: 1.5;
}

.group-empty__btn {
  margin-top: 20px;
  min-width: 140px;
  height: 40px;
  padding: 0 24px;
  border: none;
  border-radius: 20px;
  background: #3653a0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.group-empty__btn:hover {
  background: #2f4a90;
}

.group-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px 0;
  background: #f7fafc;
}

.group-tabs {
  display: inline-flex;
  align-items: stretch;
  width: 372px;
  height: 58px;
  box-sizing: border-box;
  padding: 6px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(31, 45, 61, 0.08);
}

.group-tabs :deep(.el-radio-button) {
  flex: 1;
  height: auto;
  margin: 0;
  display: flex !important;
  align-items: stretch;
  --el-radio-button-checked-bg-color: #3653a0;
  --el-radio-button-checked-text-color: #fff;
  --el-radio-button-checked-border-color: transparent;
  --el-border: none;
}

.group-tabs :deep(.el-radio-button__inner) {
  width: 100%;
  height: 100% !important;
  min-height: 0;
  padding: 0 12px !important;
  border: 0 !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  outline: none !important;
  background: transparent !important;
  box-shadow: none !important;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: bold;
  line-height: 20px;
  text-align: center;
  display: flex !important;
  align-items: center;
  justify-content: center;
  color: #3653a0;
}

.group-tabs :deep(.el-radio-button.is-active .el-radio-button__inner),
.group-tabs :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3653a0 !important;
  color: #fff !important;
  border-radius: 12px !important;
}

.group-toolbar__add {
  width: 188px;
  height: 56px;
  padding: 0 16px;
  border-radius: 12px;
  background: #3653a0;
  border-color: #3653a0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-weight: bold;
}

.group-toolbar__add:hover,
.group-toolbar__add:focus {
  background: #2f4a90;
  border-color: #2f4a90;
}

.group-toolbar__add-icon {
  margin-right: 4px;
  font-size: 16px;
  font-weight: bold;
}

.group-scroll {
  flex: 1;
  overflow: auto;
  margin-top: 30px;
  padding: 0 20px 24px;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 260px;
  gap: 20px;
}

.group-card {
  height: 260px;
  min-height: 260px;
  max-height: 260px;
  padding: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  overflow: hidden;
}

.group-card:hover {
  box-shadow: 0 6px 20px rgba(31, 45, 61, 0.1);
}

.group-card__header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.group-card__title-wrap {
  min-width: 0;
  flex: 1;
}

.group-card__name {
  margin: 0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.4;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-card__area {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

.group-card__batch {
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
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.group-card__batch.is-close {
  background: #00c970;
  padding: 0 4px 0 12px;
}

.group-card__batch.is-close:hover:not(:disabled) {
  background: #00b565;
}

.group-card__batch.is-open {
  background: #ff2f30;
  padding: 0 12px 0 4px;
}

.group-card__batch.is-open:hover:not(:disabled) {
  background: #e82829;
}

.group-card__batch:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.group-card__batch-badge {
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
  line-height: 1;
}

.group-card__schedule-empty {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #c0c4cc;
  font-size: 13px;
}

.group-card__schedule-icon {
  font-size: 36px;
  line-height: 1;
  opacity: 0.55;
}

.group-card__stats {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  overflow: hidden;
}

.group-card__stat {
  min-height: 0;
  padding: 10px;
  border-radius: 10px;
  background: #f7fafc;
  box-sizing: border-box;
  overflow: hidden;
}

.group-card__stat-label {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.group-card__stat-value {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
  word-break: break-all;
}

.group-card__stat-value.is-accent {
  color: #3653a0;
}

.group-card__footer {
  flex-shrink: 0;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #edf1f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.group-card__footer-label {
  font-size: 12px;
  color: #909399;
}

.group-card__footer-value {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  text-align: right;
}

@media (max-width: 1400px) {
  .group-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .group-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
