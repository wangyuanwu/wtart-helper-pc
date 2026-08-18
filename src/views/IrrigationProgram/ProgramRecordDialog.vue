<template>
  <el-drawer
    :model-value="modelValue"
    title="运行记录"
    direction="rtl"
    size="800px"
    append-to-body
    destroy-on-close
    class="program-record-drawer"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <div class="program-record">
      <!-- 时间范围 -->
      <div class="program-record__time-bar">
        <div class="program-record__tabs">
          <button
            v-for="tab in timeTabList"
            :key="tab.key"
            type="button"
            class="program-record__tab"
            :class="{ 'is-active': activeTimeType === tab.key }"
            @click="onTimeTabClick(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="program-record__range-row">
          <button
            type="button"
            class="program-record__arrow"
            @click="shiftRange(-1)"
          >
            ‹
          </button>
          <el-date-picker
            v-if="activeTimeType === 'custom'"
            v-model="customDateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :disabled-date="disableFutureDate"
            class="program-record__daterange"
            @change="onCustomRangeChange"
          />
          <span v-else class="program-record__range-text">{{ displayRange }}</span>
          <button
            type="button"
            class="program-record__arrow"
            :disabled="isRangeRightDisabled"
            @click="shiftRange(1)"
          >
            ›
          </button>
        </div>
      </div>

      <!-- 搜索 -->
      <div class="program-record__search">
        <input
          v-model="searchText"
          class="program-record__search-input"
          type="text"
          placeholder="请输入程序名称"
          @keyup.enter="onSearch"
          @input="onSearchInput"
        />
        <button type="button" class="program-record__search-btn" @click="onSearch">
          <i class="iconfont icon-farm_ic_search"></i>
        </button>
      </div>

      <!-- 筛选 -->
      <div class="program-record__filters">
        <button
          type="button"
          class="program-record__filter"
          :class="{ 'is-active': filterStatus === 0 }"
          @click="changeFilter(0)"
        >
          全部({{ allNum }}个)
        </button>
        <button
          type="button"
          class="program-record__filter"
          :class="{ 'is-active': filterStatus === 1 }"
          @click="changeFilter(1)"
        >
          执行成功({{ successNum }}个)
        </button>
        <button
          type="button"
          class="program-record__filter"
          :class="{ 'is-active': filterStatus === 2 }"
          @click="changeFilter(2)"
        >
          执行失败({{ failNum }}个)
        </button>
      </div>

      <!-- 列表 -->
      <div
        ref="listRef"
        v-loading="loading && pageIndex === 1"
        class="program-record__list"
        @scroll="onListScroll"
      >
        <template v-if="dayArr.length">
          <section
            v-for="(dayItem, di) in dayArr"
            :key="dayItem.dayKey || di"
            class="program-record__day"
          >
            <div class="program-record__day-head">
              <span class="program-record__day-title">{{ dayItem.dayTitle }}</span>
              <span class="program-record__day-count">{{ dayItem.list.length }}项记录</span>
            </div>
            <article
              v-for="(record, ri) in dayItem.list"
              :key="record.id || `${di}-${ri}`"
              class="program-record__item"
            >
              <div class="program-record__item-head">
                <span class="program-record__item-name">{{ record.name }}</span>
                <span
                  class="program-record__item-status"
                  :class="record.status === 5 ? 'is-fail' : 'is-success'"
                >
                  {{ statusList[record.status] ?? '--' }}
                </span>
              </div>
              <div class="program-record__item-meta">
                <template v-if="record.userName != null">
                  操作人：{{ record.userName || '--' }}
                </template>
                <template v-else>定时执行</template>
              </div>
              <div class="program-record__item-time">
                执行时间：{{ formatRecordRange(record.startTime, record.endTime) }}
              </div>
              <div
                v-if="record.status === 5 && record.failReason"
                class="program-record__item-fail"
              >
                {{ record.failReason }}
              </div>
            </article>
          </section>
        </template>

        <div v-if="loading && pageIndex > 1" class="program-record__foot-tip">
          加载中...
        </div>
        <div
          v-else-if="noMore && !loading && dayArr.length === 0"
          class="program-record__foot-tip"
        >
          暂无筛选数据
        </div>
        <div
          v-else-if="noMore && !loading && dayArr.length > 0"
          class="program-record__foot-tip"
        >
          没有更多数据了
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
/**
 * 运行记录抽屉（右侧 Drawer）
 * 对齐移动端 pages/home/activity/base/record/record_group_pro
 */
import { computed, ref, watch } from 'vue'
import { getProgramRecord } from '@/api/irrigationProgram'
import { useFarmStore } from '@/store/farm'
import { getDateOffsetStr, getNowDateStr } from '@/utils/programTime'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const farmStore = useFarmStore()

const PAGE_SIZE = 20
const statusList = ['待执行', '运行中', '已暂停', '已完成', '已取消', '异常']

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

const listRef = ref(null)
const loading = ref(false)
const noMore = ref(false)
const pageIndex = ref(1)
const recordList = ref([])
const filterStatus = ref(0)
const searchText = ref('')
const activeTimeType = ref('day')
const rangeOffset = ref(0)
const startDate = ref('')
const endDate = ref('')
const customDateRange = ref([])
const groupByDayList = ref({})
const allNum = ref(0)
const successNum = ref(0)
const failNum = ref(0)

const dayArr = computed(() => Object.values(groupByDayList.value))

const displayRange = computed(() => {
  if (!startDate.value || !endDate.value) return ''
  return `${formatDateCN(startDate.value)}-${formatDateCN(endDate.value)}`
})

const isRangeRightDisabled = computed(() => {
  if (!endDate.value) return true
  const today = getNowDateStr()
  return endDate.value >= today
})

const getFarmId = () =>
  farmStore.s_selectFarm?.id ??
  farmStore.selectFarm?.id ??
  farmStore.s_farm_info?.id ??
  null

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDateCN(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function formatRecordTime(utcStr) {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function formatRecordRange(start, end) {
  return `${formatRecordTime(start)}-${formatRecordTime(end)}`
}

function disableFutureDate(date) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date.getTime() > today.getTime()
}

function applyPresetRange(type, offset = 0) {
  const cfg = typeConfig[type]
  if (!cfg) return
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() - offset * cfg.step)
  const start = new Date(end)
  start.setDate(start.getDate() - (cfg.length - 1))
  startDate.value = formatYmd(start)
  endDate.value = formatYmd(end)
}

function formatYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function onTimeTabClick(key) {
  activeTimeType.value = key
  rangeOffset.value = 0
  if (key === 'custom') {
    if (!customDateRange.value?.length) {
      const today = getNowDateStr()
      customDateRange.value = [today, today]
    }
    startDate.value = customDateRange.value[0]
    endDate.value = customDateRange.value[1]
  } else {
    applyPresetRange(key, 0)
  }
  fetchRecords(true)
}

function shiftRange(direction) {
  if (activeTimeType.value === 'custom') return
  const cfg = typeConfig[activeTimeType.value]
  if (!cfg) return
  if (direction > 0 && isRangeRightDisabled.value) return
  rangeOffset.value = Math.max(0, rangeOffset.value - direction)
  applyPresetRange(activeTimeType.value, rangeOffset.value)
  fetchRecords(true)
}

function onCustomRangeChange(val) {
  if (!val || val.length < 2) return
  startDate.value = val[0]
  endDate.value = val[1]
  fetchRecords(true)
}

function getDayTitle(dateStr) {
  const today = getNowDateStr()
  const yest = getDateOffsetStr(today, -1)
  const now = new Date()
  const weekDay = now.getDay() || 7
  const weekStart = getDateOffsetStr(today, -(weekDay - 1))
  const weekEnd = getDateOffsetStr(today, 7 - weekDay)
  if (dateStr === today) return `今天 · ${today}`
  if (dateStr === yest) return `昨天 · ${dateStr}`
  if (dateStr >= weekStart && dateStr <= weekEnd) return `本周 · ${dateStr}`
  return `更早 · ${dateStr}`
}

function calcTotalCount() {
  let success = 0
  let fail = 0
  recordList.value.forEach((item) => {
    if (item.status === 5) fail += 1
    else success += 1
  })
  successNum.value = success
  failNum.value = fail
  allNum.value = success + fail
}

const filterList = computed(() => {
  if (filterStatus.value === 1) {
    return recordList.value.filter((item) => item.status !== 5)
  }
  if (filterStatus.value === 2) {
    return recordList.value.filter((item) => item.status === 5)
  }
  return recordList.value
})

function groupData(list) {
  const group = {}
  list.forEach((item) => {
    const dayStr = item.startTime ? String(item.startTime).split('T')[0] : ''
    if (!dayStr) return
    if (!group[dayStr]) {
      group[dayStr] = {
        dayKey: dayStr,
        dayTitle: getDayTitle(dayStr),
        list: []
      }
    }
    group[dayStr].list.push(item)
  })
  groupByDayList.value = group
}

function changeFilter(type) {
  filterStatus.value = type
  groupData(filterList.value)
  calcTotalCount()
}

async function fetchRecords(isReset = false) {
  const farmId = getFarmId()
  if (farmId == null || loading.value) return
  if (!startDate.value || !endDate.value) return

  loading.value = true
  if (isReset) {
    pageIndex.value = 1
    recordList.value = []
    noMore.value = false
    allNum.value = 0
    successNum.value = 0
    failNum.value = 0
  }

  try {
    const res = await getProgramRecord(
      {
        FarmId: farmId,
        StartTime: startDate.value,
        EndTime: endDate.value,
        PageIndex: pageIndex.value,
        PageSize: PAGE_SIZE,
        SearchText: searchText.value.trim()
      },
      { silent: pageIndex.value > 1 }
    )
    const list = Array.isArray(res?.data?.result) ? res.data.result : []
    if (isReset) {
      recordList.value = list
    } else {
      recordList.value = [...recordList.value, ...list]
    }
    calcTotalCount()
    groupData(filterList.value)
    noMore.value = list.length < PAGE_SIZE
  } catch (e) {
    console.error('[ProgramRecordDialog] 获取记录失败', e)
    if (isReset) {
      recordList.value = []
      allNum.value = 0
      successNum.value = 0
      failNum.value = 0
      groupData([])
    }
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (noMore.value || loading.value) return
  pageIndex.value += 1
  fetchRecords(false)
}

function onListScroll(e) {
  const el = e.target
  if (!el || loading.value || noMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}

function onSearch() {
  fetchRecords(true)
}

function onSearchInput() {
  if (!searchText.value.trim()) {
    fetchRecords(true)
  }
}

function resetState() {
  searchText.value = ''
  filterStatus.value = 0
  activeTimeType.value = 'day'
  rangeOffset.value = 0
  customDateRange.value = []
  const today = getNowDateStr()
  startDate.value = today
  endDate.value = today
  recordList.value = []
  groupByDayList.value = {}
  pageIndex.value = 1
  noMore.value = false
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

function onOpened() {
  resetState()
  applyPresetRange('day', 0)
  fetchRecords(true)
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && listRef.value) {
      listRef.value.scrollTop = 0
    }
  }
)
</script>

<style scoped>
.program-record {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.program-record__time-bar {
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3653a0 0%, #4a6bc7 100%);
}

.program-record__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.program-record__tab {
  padding: 6px 14px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  cursor: pointer;
}

.program-record__tab.is-active {
  background: #fff;
  color: #3653a0;
  font-weight: 600;
}

.program-record__range-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.program-record__arrow {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.program-record__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.program-record__range-text {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.program-record__daterange {
  width: 280px;
}

.program-record__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f5f7fa;
}

.program-record__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.program-record__search-btn {
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  padding: 4px;
}

.program-record__filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.program-record__filter {
  padding: 6px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 18px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}

.program-record__filter.is-active {
  border-color: #3653a0;
  background: #3653a0;
  color: #fff;
}

.program-record__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.program-record__day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.program-record__day-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.program-record__day-count {
  font-size: 12px;
  color: #909399;
}

.program-record__item {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #edf1f7;
}

.program-record__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.program-record__item-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.program-record__item-status {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.program-record__item-status.is-success {
  color: #39b54a;
}

.program-record__item-status.is-fail {
  color: #f53f3f;
}

.program-record__item-meta,
.program-record__item-time {
  margin-top: 10px;
  font-size: 13px;
  color: #909399;
}

.program-record__item-fail {
  margin-top: 8px;
  font-size: 13px;
  color: #f53f3f;
  line-height: 1.5;
}

.program-record__foot-tip {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>

<style>
.program-record-drawer.el-drawer {
  border-radius: 16px 0 0 16px;
  overflow: hidden;
}

.program-record-drawer .el-drawer__header {
  margin-bottom: 12px;
  padding: 16px 20px 0;
}

.program-record-drawer .el-drawer__title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.program-record-drawer .el-drawer__body {
  padding: 8px 20px 20px;
  overflow: hidden;
}
</style>
