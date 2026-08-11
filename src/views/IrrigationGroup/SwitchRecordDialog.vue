<template>
  <el-dialog
    :model-value="modelValue"
    title="开关记录"
    width="920px"
    append-to-body
    destroy-on-close
    draggable
    overflow
    :close-on-click-modal="false"
    class="switch-record-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <div class="switch-record">
      <!-- 时间范围（对齐移动端 a-record-time） -->
      <div class="switch-record__time-bar">
        <div class="switch-record__tabs">
          <button
            v-for="tab in timeTabList"
            :key="tab.key"
            type="button"
            class="switch-record__tab"
            :class="{ 'is-active': activeTimeType === tab.key }"
            @click="onTimeTabClick(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="switch-record__range-row">
          <button
            type="button"
            class="switch-record__arrow"
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
            class="switch-record__daterange"
            @change="onCustomRangeChange"
          />
          <span v-else class="switch-record__range-text">{{ displayRange }}</span>
          <button
            type="button"
            class="switch-record__arrow"
            :disabled="isRangeRightDisabled"
            @click="shiftRange(1)"
          >
            ›
          </button>
        </div>
      </div>

      <!-- 搜索操作人 -->
      <div class="switch-record__search">
        <input
          v-model="searchText"
          class="switch-record__search-input"
          type="text"
          placeholder="请输入操作人"
          @keyup.enter="onSearch"
          @input="onSearchInput"
        />
        <button type="button" class="switch-record__search-btn" @click="onSearch">
          <i class="iconfont icon-farm_ic_search"></i>
        </button>
      </div>

      <!-- 成功/失败筛选 -->
      <div class="switch-record__filters">
        <button
          type="button"
          class="switch-record__filter"
          :class="{ 'is-active': filterStatus === 0 }"
          @click="changeFilter(0)"
        >
          全部({{ allNum }}个)
        </button>
        <button
          type="button"
          class="switch-record__filter"
          :class="{ 'is-active': filterStatus === 1 }"
          @click="changeFilter(1)"
        >
          执行成功({{ successNum }}个)
        </button>
        <button
          type="button"
          class="switch-record__filter"
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
        class="switch-record__list"
        @scroll="onListScroll"
      >
        <template v-if="dayArr.length">
          <section
            v-for="(dayItem, di) in dayArr"
            :key="dayItem.dayKey || di"
            class="switch-record__day"
          >
            <div class="switch-record__day-head">
              <span class="switch-record__day-title">{{ dayItem.dayTitle }}</span>
              <span class="switch-record__day-count">{{ dayItem.list.length }}项记录</span>
            </div>
            <article
              v-for="(record, ri) in dayItem.list"
              :key="record.id || `${di}-${ri}`"
              class="switch-record__item"
            >
              <div class="switch-record__item-head">
                <span class="switch-record__item-name">
                  {{ record.actionName || '--' }}
                </span>
                <span
                  class="switch-record__item-status"
                  :class="record.result ? 'is-success' : 'is-fail'"
                >
                  <i
                    class="iconfont"
                    :class="
                      record.result
                        ? 'icon-shibai'
                        : 'icon-device_ic_add_gantanhao'
                    "
                  ></i>
                  {{ record.result ? '执行成功' : '执行失败' }}
                </span>
              </div>
              <div class="switch-record__item-meta">
                {{ getModelText(record) }}
              </div>
              <div class="switch-record__item-row">
                <span class="switch-record__item-user">
                  <i class="iconfont icon-device_ic_admin"></i>
                  操作人：{{ record.userName || '--' }}
                </span>
                <span class="switch-record__item-time">
                  {{ formatOpTime(record.operationTimeUtc) }}
                </span>
              </div>
              <div
                v-if="!record.result && record.failReason"
                class="switch-record__item-fail"
              >
                {{ record.failReason }}
              </div>
            </article>
          </section>
        </template>

        <div v-if="loading && pageIndex > 1" class="switch-record__foot-tip">
          加载中...
        </div>
        <div
          v-else-if="noMore && !loading && dayArr.length === 0"
          class="switch-record__foot-tip"
        >
          暂无筛选数据
        </div>
        <div
          v-else-if="noMore && !loading && dayArr.length > 0"
          class="switch-record__foot-tip"
        >
          没有更多数据了
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
/**
 * 开关记录弹窗
 * 对齐移动端 pages/home/activity/base/record/record_page?from=group
 * TargetType: 0=设备 1=轮灌组
 */
import { computed, ref, watch } from 'vue'
import { getLog } from '@/api/log'
import { useFarmStore } from '@/store/farm'
import { getDateOffsetStr, getNowDateStr } from '@/utils/programTime'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 0=设备 1=轮灌组，默认轮灌组 */
  targetType: { type: Number, default: 1 },
  /** 目标 id；为空时从 store 的组详情读取 */
  targetId: { type: [Number, String], default: null }
})

const emit = defineEmits(['update:modelValue'])

const farmStore = useFarmStore()

const PAGE_SIZE = 20

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
  return endDate.value >= getNowDateStr()
})

const filterList = computed(() => {
  if (filterStatus.value === 1) {
    return recordList.value.filter((item) => item.result === true)
  }
  if (filterStatus.value === 2) {
    return recordList.value.filter((item) => item.result === false)
  }
  return recordList.value
})

function resolveTargetId() {
  if (props.targetId != null && props.targetId !== '') return props.targetId
  if (Number(props.targetType) === 1) {
    return (
      farmStore.s_group_detail_info?.id ||
      farmStore.s_group_list_item?.id ||
      null
    )
  }
  // targetType=0 设备：对齐移动端 vuex_control_device_info
  return farmStore.s_control_device?.id || null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatDateCN(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

/** 对齐移动端 formatUtc → YYYY-MM-DD HH:mm:ss */
function formatUtcFull(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function formatOpTime(utcStr) {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function getModelText(item) {
  if (!item) return '--'
  if (item.tiggerObject == 2) return '自动轮灌'
  if (item.mode == 0) return '手动'
  if (item.mode == 1) return '定时'
  return '--'
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
    if (item.result) success += 1
    else fail += 1
  })
  successNum.value = success
  failNum.value = fail
  allNum.value = success + fail
}

function groupData(list) {
  const group = {}
  list.forEach((item) => {
    const full = formatUtcFull(item.operationTimeUtc)
    const dayStr = full ? full.split(' ')[0] : ''
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
}

async function fetchRecords(isReset = false) {
  const id = resolveTargetId()
  if (id == null || loading.value) return
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
    const res = await getLog(
      {
        TargetType: props.targetType,
        TargetId: id,
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
    console.error('[SwitchRecordDialog] 获取开关记录失败', e)
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
  allNum.value = 0
  successNum.value = 0
  failNum.value = 0
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
.switch-record {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 520px;
}

.switch-record__time-bar {
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3653a0 0%, #4a6bc7 100%);
}

.switch-record__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.switch-record__tab {
  padding: 6px 14px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  cursor: pointer;
}

.switch-record__tab.is-active {
  background: #fff;
  color: #3653a0;
  font-weight: 600;
}

.switch-record__range-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.switch-record__arrow {
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

.switch-record__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.switch-record__range-text {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.switch-record__daterange {
  width: 280px;
}

.switch-record__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f5f7fa;
}

.switch-record__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.switch-record__search-btn {
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  padding: 4px;
}

.switch-record__filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.switch-record__filter {
  padding: 6px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 18px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}

.switch-record__filter.is-active {
  border-color: #3653a0;
  background: #3653a0;
  color: #fff;
}

.switch-record__list {
  flex: 1;
  min-height: 320px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.switch-record__day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.switch-record__day-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.switch-record__day-count {
  font-size: 12px;
  color: #909399;
}

.switch-record__item {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #edf1f7;
}

.switch-record__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.switch-record__item-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.switch-record__item-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.switch-record__item-status .iconfont {
  font-size: 14px;
  line-height: 1;
}

.switch-record__item-status.is-success {
  color: #39b54a;
}

.switch-record__item-status.is-fail {
  color: #f53f3f;
}

.switch-record__item-meta {
  margin-top: 10px;
  font-size: 13px;
  color: #909399;
}

.switch-record__item-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #909399;
}

.switch-record__item-user {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.switch-record__item-user .iconfont {
  font-size: 14px;
  line-height: 1;
}

.switch-record__item-time {
  flex-shrink: 0;
}

.switch-record__item-fail {
  margin-top: 8px;
  font-size: 13px;
  color: #f53f3f;
  line-height: 1.5;
}

.switch-record__foot-tip {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>

<style>
.switch-record-dialog .el-dialog__body {
  padding-top: 8px;
}

.switch-record-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
}
</style>
