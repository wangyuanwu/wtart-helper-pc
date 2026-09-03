<template>
  <el-dialog
    :model-value="modelValue"
    width="720px"
    append-to-body
    destroy-on-close
    align-center
    draggable
    overflow
    :close-on-click-modal="false"
    class="farm-irr-stats-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
    @closed="onClosed"
  >
    <template #header>
      <div class="farm-irr-stats-dialog__title">灌溉统计</div>
    </template>

    <div class="farm-irr-stats">
      <!-- 时间范围：样式对齐开关记录弹窗头部日历/天数筛选 -->
      <div class="farm-irr-stats__time-bar">
        <div class="farm-irr-stats__tabs">
          <button
            v-for="(tab, idx) in timeTabList"
            :key="tab.key"
            type="button"
            class="farm-irr-stats__tab"
            :class="{ 'is-active': timeIndex === idx }"
            @click="onTimeTabClick(idx)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="farm-irr-stats__range-row">
          <button
            type="button"
            class="farm-irr-stats__arrow"
            @click="shiftRange(-1)"
          >
            ‹
          </button>
          <div class="farm-irr-stats__range-main">
            <el-date-picker
              v-if="timeIndex === 5"
              v-model="customDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              unlink-panels
              :disabled-date="disableFutureDate"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              class="farm-irr-stats__daterange"
              @change="onCustomRangeChange"
            />
            <template v-else>
              <span class="farm-irr-stats__range-text">{{ displayRange }}</span>
              <i class="iconfont icon-device_ic_timing farm-irr-stats__range-icon"></i>
            </template>
          </div>
          <button
            type="button"
            class="farm-irr-stats__arrow"
            :disabled="isRangeRightDisabled"
            @click="shiftRange(1)"
          >
            ›
          </button>
        </div>
      </div>

      <!-- 地块 + 阀门名搜索 -->
      <div class="farm-irr-stats__search">
        <el-select
          v-model="landIndex"
          class="farm-irr-stats__land"
          placeholder="选择地块"
          :disabled="!landSourceList.length"
          @change="onChangeLand"
        >
          <el-option
            v-for="(name, idx) in landNameList"
            :key="`${idx}-${name}`"
            :label="name"
            :value="idx"
          />
        </el-select>
        <el-input
          v-model="searchText"
          class="farm-irr-stats__input"
          clearable
          placeholder="请输入阀门名称"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix>
            <i class="iconfont icon-farm_ic_search"></i>
          </template>
        </el-input>
        <el-button type="primary" @click="onSearch">搜索</el-button>
      </div>

      <div
        ref="listRef"
        class="farm-irr-stats__scroll"
        @scroll="onScroll"
      >
        <!-- 汇总竖条（对齐移动端 a-v-progress-tv 假百分比） -->
        <div v-if="irrInfo" class="farm-irr-stats__summary">
          <div
            v-for="item in summaryCards"
            :key="item.key"
            class="farm-irr-stats__summary-item"
          >
            <div class="farm-irr-stats__progress">
              <div class="farm-irr-stats__progress-track">
                <div
                  class="farm-irr-stats__progress-fill"
                  :style="{
                    height: `${item.percent}%`,
                    background: item.color
                  }"
                ></div>
              </div>
              <div
                class="farm-irr-stats__progress-label"
                :style="{ bottom: `${item.percent}%`, color: item.color }"
              >
                {{ item.text }}
              </div>
            </div>
            <div class="farm-irr-stats__summary-name">{{ item.name }}</div>
          </div>
        </div>

        <div v-if="groupIrrList.length" class="farm-irr-stats__detail-title">
          详情
        </div>

        <el-timeline
          v-if="groupIrrList.length"
          class="farm-irr-stats__el-timeline"
        >
          <el-timeline-item
            v-for="(item, index) in groupIrrList"
            :key="`${item._dayKey}-${index}-${item.startTime}`"
            :timestamp="getTimelineTimestamp(item)"
            placement="top"
            type="primary"
            color="#409eff"
            size="large"
          >
            <article class="farm-irr-stats__card">
              <div class="farm-irr-stats__card-head">
                <div class="farm-irr-stats__card-title">
                  <span>{{ item.name || '--' }}</span>
                  <span
                    v-if="Number(item.valvePlace) !== 0"
                    class="farm-irr-stats__port"
                  >
                    ({{ getValueByType(item.valvePlace) }})
                  </span>
                </div>
              </div>
              <div class="farm-irr-stats__card-metrics">
                <div class="farm-irr-stats__metric">
                  <div class="farm-irr-stats__metric-val is-duration">
                    {{ second2HHmmUnity(item.duration) }}
                  </div>
                  <div class="farm-irr-stats__metric-label">灌溉时长</div>
                </div>
                <div class="farm-irr-stats__metric-divider"></div>
                <div class="farm-irr-stats__metric is-center">
                  <div class="farm-irr-stats__metric-val is-volume">
                    {{ numEmpty0(item.volume, 1) }}
                    <span class="farm-irr-stats__unit">m³</span>
                  </div>
                  <div class="farm-irr-stats__metric-label">灌溉量</div>
                </div>
                <div class="farm-irr-stats__metric-divider"></div>
                <div class="farm-irr-stats__metric is-end">
                  <div class="farm-irr-stats__metric-val is-fert">
                    {{ numEmpty0(item.fertilizerVolume, 1) }}
                    <span class="farm-irr-stats__unit">m³</span>
                  </div>
                  <div class="farm-irr-stats__metric-label">施肥量</div>
                </div>
              </div>
            </article>
          </el-timeline-item>
        </el-timeline>

        <div v-if="loading" class="farm-irr-stats__tip">加载中...</div>
        <div
          v-else-if="noMore && !irrRecord.length"
          class="farm-irr-stats__tip"
        >
          暂无筛选数据
        </div>
        <div
          v-else-if="noMore && irrRecord.length"
          class="farm-irr-stats__tip"
        >
          没有更多数据了
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getLandList } from '@/api/map'
import { getIrrRecordList, getIrrSummary } from '@/api/irrigationRecord'
import { useFarmStore } from '@/store/farm'
import { getNowDateStr } from '@/utils/programTime'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const farmStore = useFarmStore()

const PAGE_SIZE = 20
const PROGRESS_FACTOR = 1000

const timeTabList = [
  { key: 'day', label: '一天' },
  { key: 'threeDays', label: '三天' },
  { key: 'week', label: '七天' },
  { key: 'month', label: '一个月' },
  { key: 'threeMonths', label: '三个月' },
  { key: 'custom', label: '自定义' }
]

const typeConfig = {
  day: { length: 1, step: 1 },
  threeDays: { length: 3, step: 3 },
  week: { length: 7, step: 7 },
  month: { length: 30, step: 30 },
  threeMonths: { length: 90, step: 90 }
}

const portList = [
  { value: '关闭', type: 0 },
  { value: 'A口', type: 1 },
  { value: 'B口', type: 2 },
  { value: 'C口', type: 3 },
  { value: 'D口', type: 4 },
  { value: 'AB口', type: 5 },
  { value: 'AC口', type: 6 },
  { value: 'BD口', type: 7 },
  { value: 'BC口', type: 8 }
]

/** 对齐移动端 vuex_history_farm_data（仅内存） */
let historyFarmData = {
  landIndex: 0,
  timeIndex: 0,
  searchText: ''
}

const listRef = ref(null)
const loading = ref(false)
const noMore = ref(false)
const pageIndex = ref(1)
const irrInfo = ref(null)
const irrRecord = ref([])
const landSourceList = ref([])
const landNameList = ref([])
const landIndex = ref(0)
const landId = ref('')
const searchText = ref('')
const timeIndex = ref(0)
const rangeOffset = ref(0)
const startDate = ref('')
const endDate = ref('')
const customDateRange = ref([])
let timeChangeTimer = null

const displayRange = computed(() => {
  if (!startDate.value || !endDate.value) return ''
  return `${formatDateCN(startDate.value)}-${formatDateCN(endDate.value)}`
})

const isRangeRightDisabled = computed(() => {
  if (!endDate.value) return true
  return endDate.value >= getNowDateStr()
})

const StartTime = computed(() => startDate.value || '')
const EndTime = computed(() => endDate.value || '')

const summaryCards = computed(() => {
  const info = irrInfo.value || {}
  return [
    {
      key: 'duration',
      name: '灌溉时长',
      color: '#53A3FD',
      text: second2HHmmUnity(info.duration),
      percent: fakePercent(info.duration)
    },
    {
      key: 'volume',
      name: '灌溉量',
      color: '#65DDB9',
      text: `${numEmpty0(info.volume, 1)}m3`,
      percent: fakePercent(info.volume)
    },
    {
      key: 'fert',
      name: '施肥量',
      color: '#FEA23F',
      text: `${numEmpty0(info.fertilizerVolume, 1)}m3`,
      percent: fakePercent(info.fertilizerVolume)
    }
  ]
})

/** 对齐移动端 groupIrrList：按 endTime 本地日期分组 */
const groupIrrList = computed(() => {
  const list = irrRecord.value || []
  let lastDay = null
  return list.map((item) => {
    const d = new Date(item.endTime)
    const dayKey = Number.isNaN(d.getTime())
      ? ''
      : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const _showDate = dayKey !== lastDay
    if (_showDate) lastDay = dayKey
    return { ...item, _dayKey: dayKey, _showDate }
  })
})

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDateCN(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function formatYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatDayCN(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 对齐移动端 formatUtcCustom(..., 'dd hh:mm') */
function formatRangeTime(utcStr) {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Timeline 左侧时间戳：同日首条带完整日期，其余仅时段 */
function getTimelineTimestamp(item) {
  const timeRange = `${formatRangeTime(item.startTime)}~${formatRangeTime(item.endTime)}`
  if (item._showDate) {
    return `${formatDayCN(item.endTime)} ${timeRange}`
  }
  return timeRange
}

function getValueByType(type) {
  const hit = portList.find((item) => item.type === Number(type))
  return hit ? hit.value : '--'
}

/** 对齐移动端 second2HHmmUnity */
function second2HHmmUnity(value) {
  let secondTime = parseInt(value, 10)
  if (!Number.isFinite(secondTime) || secondTime < 0) secondTime = 0
  let minuteTime = 0
  let hourTime = 0
  if (secondTime >= 60) {
    minuteTime = Math.floor(secondTime / 60)
    if (minuteTime >= 60) {
      hourTime = Math.floor(minuteTime / 60)
      minuteTime %= 60
    }
  }
  if (hourTime > 0 && minuteTime > 0) return `${hourTime}h${minuteTime}m`
  if (hourTime > 0) return `${hourTime}h`
  return `${minuteTime}m`
}

function numEmpty0(v, size) {
  if (v === null || v === undefined || v === '') return '0'
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return n.toFixed(size)
}

/** 对齐移动端 a-v-progress-tv：假百分比，封顶 80% */
function fakePercent(v) {
  const n = Number(v)
  const val = !Number.isFinite(n) || n < 0 ? 0 : n
  const raw = (val / (val + PROGRESS_FACTOR)) * 100
  return Math.min(Math.max(raw, 0), 80)
}

function disableFutureDate(date) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date.getTime() > today.getTime()
}

/** 对齐移动端 a-record-time.updateRange */
function applyPresetRange(tabKey, offset = 0) {
  const cfg = typeConfig[tabKey]
  if (!cfg) return
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - cfg.length + 1 + offset * cfg.step)
  const end = new Date(today)
  end.setDate(end.getDate() + offset * cfg.step)
  startDate.value = formatYmd(start)
  endDate.value = formatYmd(end)
}

function scheduleReload() {
  if (timeChangeTimer) clearTimeout(timeChangeTimer)
  timeChangeTimer = setTimeout(() => {
    fetchSummary()
    fetchRecordList(true)
  }, 200)
}

function onTimeTabClick(idx) {
  timeIndex.value = idx
  rangeOffset.value = 0
  const tab = timeTabList[idx]
  if (!tab) return
  if (tab.key === 'custom') {
    if (!customDateRange.value?.length) {
      const today = getNowDateStr()
      customDateRange.value = [today, today]
    }
    startDate.value = customDateRange.value[0]
    endDate.value = customDateRange.value[1]
  } else {
    applyPresetRange(tab.key, 0)
  }
  scheduleReload()
}

function shiftRange(direction) {
  if (timeIndex.value === 5) {
    if (!startDate.value || !endDate.value) return
    if (direction > 0 && isRangeRightDisabled.value) return
    const start = new Date(`${startDate.value}T00:00:00`)
    const end = new Date(`${endDate.value}T00:00:00`)
    const days =
      Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) || 1
    const offsetMs = days * 24 * 60 * 60 * 1000 * direction
    const nextStart = new Date(start.getTime() + offsetMs)
    const nextEnd = new Date(end.getTime() + offsetMs)
    startDate.value = formatYmd(nextStart)
    endDate.value = formatYmd(nextEnd)
    customDateRange.value = [startDate.value, endDate.value]
    scheduleReload()
    return
  }
  const tab = timeTabList[timeIndex.value]
  const cfg = typeConfig[tab?.key]
  if (!cfg) return
  if (direction > 0 && isRangeRightDisabled.value) return
  // 对齐移动端：左箭头 offset-=1（更早），右箭头 offset+=1（更近）
  rangeOffset.value += direction
  applyPresetRange(tab.key, rangeOffset.value)
  scheduleReload()
}

function onCustomRangeChange(val) {
  if (!val || val.length < 2) return
  startDate.value = val[0]
  endDate.value = val[1]
  scheduleReload()
}

function onChangeLand(idx) {
  landIndex.value = idx
  const land = landSourceList.value[idx]
  if (!land) return
  landId.value = land.id
  fetchSummary()
  fetchRecordList(true)
}

function onSearch() {
  fetchSummary()
  fetchRecordList(true)
}

function getFarmId() {
  return farmStore.selectFarm?.id ?? farmStore.s_selectFarm?.id ?? null
}

function saveHistory() {
  historyFarmData = {
    landIndex: landIndex.value,
    timeIndex: timeIndex.value,
    searchText: searchText.value
  }
}

function initHistory() {
  timeIndex.value = historyFarmData.timeIndex || 0
  if (
    landNameList.value.length > historyFarmData.landIndex &&
    historyFarmData.landIndex >= 0
  ) {
    landIndex.value = historyFarmData.landIndex
  } else {
    landIndex.value = 0
  }
  searchText.value = historyFarmData.searchText || ''
}

async function fetchLandList() {
  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    landSourceList.value = []
    landNameList.value = []
    landId.value = ''
    irrInfo.value = null
    irrRecord.value = []
    return
  }
  try {
    const res = await getLandList({ farmId }, { silent: true })
    const list = Array.isArray(res?.data) ? res.data : []
    landSourceList.value = list
    landNameList.value = list.map((item) => item.name || '未命名地块')
    initHistory()
    if (landSourceList.value.length > 0) {
      landId.value = landSourceList.value[landIndex.value]?.id ?? ''
    } else {
      landId.value = ''
    }
    const tab = timeTabList[timeIndex.value]
    if (tab?.key === 'custom') {
      if (!customDateRange.value?.length) {
        const today = getNowDateStr()
        customDateRange.value = [today, today]
      }
      startDate.value = customDateRange.value[0]
      endDate.value = customDateRange.value[1]
    } else {
      rangeOffset.value = 0
      applyPresetRange(tab?.key || 'day', 0)
    }
    await Promise.all([fetchSummary(), fetchRecordList(true)])
  } catch (e) {
    console.error('[FarmIrrStats] 获取地块失败', e)
  }
}

async function fetchSummary() {
  const farmId = getFarmId()
  if (farmId == null || !StartTime.value || !EndTime.value) return
  saveHistory()
  try {
    const res = await getIrrSummary(
      {
        FarmId: farmId,
        LandId: landId.value,
        SearchText: searchText.value,
        StartTime: StartTime.value,
        EndTime: EndTime.value
      },
      { silent: true }
    )
    irrInfo.value = res?.data || null
  } catch (e) {
    console.error('[FarmIrrStats] 获取汇总失败', e)
  }
}

async function fetchRecordList(isReset = false) {
  const farmId = getFarmId()
  if (farmId == null || !StartTime.value || !EndTime.value) return
  if (loading.value) return
  loading.value = true
  if (isReset) {
    pageIndex.value = 1
    irrRecord.value = []
    noMore.value = false
  }
  try {
    const res = await getIrrRecordList(
      {
        FarmId: farmId,
        LandId: landId.value,
        SearchText: searchText.value,
        StartTime: StartTime.value,
        EndTime: EndTime.value,
        PageIndex: pageIndex.value,
        PageSize: PAGE_SIZE
      },
      { silent: true }
    )
    const pageData = res?.data || {}
    const list = Array.isArray(pageData.result) ? pageData.result : []
    if (isReset) irrRecord.value = list
    else irrRecord.value = [...irrRecord.value, ...list]
    if (
      pageData.pageIndex >= pageData.totalPage ||
      list.length < PAGE_SIZE
    ) {
      noMore.value = true
    } else {
      noMore.value = false
    }
  } catch (e) {
    console.error('[FarmIrrStats] 获取记录失败', e)
    if (isReset) irrRecord.value = []
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (noMore.value || loading.value) return
  pageIndex.value += 1
  fetchRecordList(false)
}

function onScroll(e) {
  const el = e?.target
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

async function onOpened() {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = 0
  await fetchLandList()
}

function onClosed() {
  if (timeChangeTimer) {
    clearTimeout(timeChangeTimer)
    timeChangeTimer = null
  }
  loading.value = false
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val && listRef.value) listRef.value.scrollTop = 0
  }
)
</script>

<style scoped>
.farm-irr-stats {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.farm-irr-stats__time-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 10px;
  flex-shrink: 0;
}

.farm-irr-stats__tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 44px;
  padding: 2px;
  border-radius: 4px;
  background: #eef1f6;
  box-sizing: border-box;
}

.farm-irr-stats__tab {
  flex: 1;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 4.36px;
  background: transparent;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 0;
}

.farm-irr-stats__tab.is-active {
  background: #3653a0;
  color: #fff;
  font-weight: 600;
}

.farm-irr-stats__range-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 30px;
  margin: 0;
  box-sizing: border-box;
}

.farm-irr-stats__arrow {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #303133;
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.farm-irr-stats__arrow:hover:not(:disabled) {
  color: #3653a0;
}

.farm-irr-stats__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.farm-irr-stats__range-main {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 30px;
}

.farm-irr-stats__range-text {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.farm-irr-stats__range-icon {
  font-size: 16px;
  color: #909399;
}

.farm-irr-stats__daterange {
  width: 280px;
}

.farm-irr-stats__search {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.farm-irr-stats__land {
  width: 160px;
  flex-shrink: 0;
}

.farm-irr-stats__input {
  flex: 1;
}

.farm-irr-stats__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.farm-irr-stats__summary {
  display: flex;
  gap: 8px;
  padding: 20px 12px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  margin-bottom: 12px;
}

.farm-irr-stats__summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.farm-irr-stats__progress {
  position: relative;
  width: 42px;
  height: 150px;
}

.farm-irr-stats__progress-track {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: #f0f2f5;
  overflow: hidden;
}

.farm-irr-stats__progress-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 6px;
  transition: height 0.25s ease;
}

.farm-irr-stats__progress-label {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}

.farm-irr-stats__summary-name {
  margin-top: 10px;
  font-size: 13px;
  color: #333;
}

.farm-irr-stats__detail-title {
  margin: 4px 0 10px;
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

.farm-irr-stats__el-timeline {
  padding-left: 2px;
  margin: 0;
}

.farm-irr-stats__el-timeline :deep(.el-timeline-item__timestamp) {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.farm-irr-stats__el-timeline :deep(.el-timeline-item__node--large) {
  left: -2px;
}

.farm-irr-stats__el-timeline :deep(.el-timeline-item__wrapper) {
  padding-left: 22px;
}

.farm-irr-stats__el-timeline :deep(.el-timeline-item:last-child .el-timeline-item__tail) {
  display: none;
}

.farm-irr-stats__card {
  margin: 0 0 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.farm-irr-stats__card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.farm-irr-stats__card-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #111;
}

.farm-irr-stats__port {
  color: #2f6bff;
  font-weight: 600;
}

.farm-irr-stats__card-metrics {
  margin-top: 12px;
  display: flex;
  align-items: center;
}

.farm-irr-stats__metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.farm-irr-stats__metric.is-center {
  align-items: center;
}

.farm-irr-stats__metric.is-end {
  align-items: flex-end;
}

.farm-irr-stats__metric-val {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.farm-irr-stats__metric-val.is-duration {
  color: #53a3fd;
}

.farm-irr-stats__metric-val.is-volume {
  color: #65ddb9;
}

.farm-irr-stats__metric-val.is-fert {
  color: #fea23f;
}

.farm-irr-stats__unit {
  font-size: 12px;
  font-weight: 500;
}

.farm-irr-stats__metric-label {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.farm-irr-stats__metric-divider {
  width: 1px;
  height: 28px;
  background: #e8e8e8;
  flex-shrink: 0;
}

.farm-irr-stats__tip {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>

<style>
.farm-irr-stats-dialog.el-dialog {
  width: 720px !important;
  height: 900px !important;
  max-height: 900px !important;
  margin-top: 0 !important;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
}

.farm-irr-stats-dialog .el-dialog__header {
  margin-right: 0;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #edf1f7;
  flex-shrink: 0;
  cursor: move;
  user-select: none;
}

.farm-irr-stats-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.farm-irr-stats-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.farm-irr-stats-dialog .el-dialog__headerbtn {
  right: 20px;
}
</style>
