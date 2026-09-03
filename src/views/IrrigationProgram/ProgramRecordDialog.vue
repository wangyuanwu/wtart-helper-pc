<template>
  <el-dialog
    :model-value="modelValue"
    width="678px"
    append-to-body
    destroy-on-close
    align-center
    draggable
    overflow
    :close-on-click-modal="false"
    class="program-record-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <template #header>
      <div class="program-record-dialog__title">运行记录</div>
    </template>

    <div class="program-record">
      <!-- 时间范围（对齐开关记录头部筛选区 / 设计稿） -->
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
          <div class="program-record__range-main">
            <el-date-picker
              v-if="activeTimeType === 'custom'"
              v-model="customDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              :disabled-date="disableFutureDate"
              class="program-record__daterange"
              @change="onCustomRangeChange"
            />
            <template v-else>
              <span class="program-record__range-text">{{ displayRange }}</span>
              <i class="iconfont icon-device_ic_timing program-record__range-icon"></i>
            </template>
          </div>
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

      <!-- 搜索：对齐移动端 record_group_pro（程序名称） -->
      <div class="program-record__search">
        <i
          class="iconfont icon-farm_ic_search program-record__search-icon"
          @click="onSearch"
        ></i>
        <input
          v-model="searchText"
          class="program-record__search-input"
          type="text"
          placeholder="请输入程序名称"
          @keyup.enter="onSearch"
          @input="onSearchInput"
        />
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

      <!-- 列表卡片：对齐移动端 record_group_pro -->
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
              <span class="program-record__day-count">
                {{ dayItem.list.length }}项记录
              </span>
            </div>
            <article
              v-for="(record, ri) in dayItem.list"
              :key="record.id || `${di}-${ri}`"
              class="program-record__item"
            >
              <div class="program-record__item-head">
                <div class="program-record__item-name-row">
                  <span class="program-record__item-name">{{ record.name }}</span>
                  <i
                    v-if="record.hasFail && record.status !== 5"
                    class="iconfont icon-device_ic_add_gantanhao program-record__item-warn"
                  ></i>
                </div>
                <span
                  class="program-record__item-status"
                  :class="getStatusInfo(record.status).tone"
                >
                  <i
                    class="iconfont"
                    :class="getStatusInfo(record.status).icon"
                  ></i>
                  {{ getStatusInfo(record.status).label }}
                </span>
              </div>

              <div class="program-record__item-meta">
                <template v-if="record.userName != null">
                  <i class="iconfont icon-device_ic_admin"></i>
                  <span>操作人：{{ record.userName || '--' }}</span>
                </template>
                <template v-else>定时执行</template>
              </div>

              <div class="program-record__item-row">
                <span class="program-record__item-time">
                  执行时间：{{ formatRecordRange(record.startTime, record.endTime) }}
                </span>
                <button
                  type="button"
                  class="program-record__detail-btn"
                  @click="onViewDetail(record)"
                >
                  查看详情
                </button>
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

    <ProgramRecordDetailDialog
      v-model="detailVisible"
      :record-id="detailRecordId"
      :title="detailTitle"
    />
  </el-dialog>
</template>

<script setup>
/**
 * 运行记录弹窗
 * 业务对齐移动端 record_group_pro；头部样式对齐开关记录弹窗
 */
import { computed, ref, watch } from 'vue'
import { getProgramRecord } from '@/api/irrigationProgram'
import { useFarmStore } from '@/store/farm'
import { getDateOffsetStr, getNowDateStr } from '@/utils/programTime'
import ProgramRecordDetailDialog from './ProgramRecordDetailDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const farmStore = useFarmStore()

const PAGE_SIZE = 20
/** 对齐移动端 statusList：0待执行…5异常 */
const statusMetaList = [
  { value: 0, label: '待执行', tone: 'is-success', icon: 'icon-shibai' },
  { value: 1, label: '运行中', tone: 'is-success', icon: 'icon-shibai' },
  { value: 2, label: '已暂停', tone: 'is-success', icon: 'icon-shibai' },
  { value: 3, label: '已完成', tone: 'is-success', icon: 'icon-shibai' },
  { value: 4, label: '已取消', tone: 'is-success', icon: 'icon-shibai' },
  {
    value: 5,
    label: '异常',
    tone: 'is-fail',
    icon: 'icon-device_ic_add_gantanhao'
  }
]

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
const detailVisible = ref(false)
const detailRecordId = ref(null)
const detailTitle = ref('记录详情')

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

function getStatusInfo(status) {
  return (
    statusMetaList.find((item) => item.value === Number(status)) || {
      label: '未知',
      tone: 'is-muted',
      icon: ''
    }
  )
}

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

function onCustomRangeChange(val) {
  if (!val?.length) return
  startDate.value = val[0]
  endDate.value = val[1]
  fetchRecords(true)
}

function shiftRange(dir) {
  if (activeTimeType.value === 'custom') return
  if (dir > 0 && isRangeRightDisabled.value) return
  rangeOffset.value = Math.max(0, rangeOffset.value - dir)
  applyPresetRange(activeTimeType.value, rangeOffset.value)
  fetchRecords(true)
}

function getDayTitle(dateStr) {
  const now = new Date()
  const today = getNowDateStr()
  const yest = getDateOffsetStr(today, -1)
  const weekDay = now.getDay() || 7
  const weekStart = getDateOffsetStr(today, -(weekDay - 1))
  if (dateStr === today) return '今天'
  if (dateStr === yest) return '昨天'
  if (dateStr >= weekStart && dateStr < today) return '本周'
  return '更早'
}

function groupData(list) {
  const map = {}
  ;(list || []).forEach((item) => {
    const d = item.startTime ? new Date(item.startTime) : null
    if (!d || Number.isNaN(d.getTime())) return
    const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    if (!map[dayKey]) {
      map[dayKey] = {
        dayKey,
        dayTitle: getDayTitle(dayKey),
        list: []
      }
    }
    map[dayKey].list.push(item)
  })
  groupByDayList.value = map
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

function getFilteredList() {
  if (filterStatus.value === 1) {
    return recordList.value.filter((item) => item.status !== 5)
  }
  if (filterStatus.value === 2) {
    return recordList.value.filter((item) => item.status === 5)
  }
  return recordList.value
}

function changeFilter(type) {
  filterStatus.value = type
  groupData(getFilteredList())
  calcTotalCount()
}

async function fetchRecords(reset = false) {
  const farmId = getFarmId()
  if (farmId == null) {
    recordList.value = []
    groupByDayList.value = {}
    return
  }
  if (loading.value) return
  if (!startDate.value || !endDate.value) return

  loading.value = true
  if (reset) {
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
    const rows = Array.isArray(res?.data?.result)
      ? res.data.result
      : Array.isArray(res?.data?.rows)
        ? res.data.rows
        : Array.isArray(res?.data)
          ? res.data
          : []
    if (reset) recordList.value = rows
    else recordList.value = [...recordList.value, ...rows]
    calcTotalCount()
    groupData(getFilteredList())
    noMore.value = rows.length < PAGE_SIZE
  } catch (e) {
    console.error('[ProgramRecordDialog] 获取运行记录失败', e)
    if (reset) {
      recordList.value = []
      groupByDayList.value = {}
      allNum.value = 0
      successNum.value = 0
      failNum.value = 0
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
  const el = e?.target
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}

function onSearch() {
  fetchRecords(true)
}

function onSearchInput() {
  if (!searchText.value) fetchRecords(true)
}

function resetState() {
  filterStatus.value = 0
  searchText.value = ''
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

function onViewDetail(record) {
  if (!record?.id) return
  detailRecordId.value = record.id
  detailTitle.value = record.name || '记录详情'
  detailVisible.value = true
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
  align-items: stretch;
  gap: 10px;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.program-record__time-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 10px;
}

.program-record__tabs {
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

.program-record__tab {
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

.program-record__tab.is-active {
  background: #3653a0;
  color: #fff;
  font-weight: 600;
}

.program-record__range-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 30px;
  margin: 0;
  box-sizing: border-box;
}

.program-record__arrow {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #f0f2f5;
  color: #606266;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.program-record__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.program-record__range-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.program-record__range-text {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.program-record__range-icon {
  font-size: 16px;
  color: #909399;
}

.program-record__daterange {
  width: 280px;
}

.program-record__search {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  background: #f7f7f7;
  box-sizing: border-box;
}

.program-record__search-icon {
  font-size: 16px;
  color: #8c8c8c;
  flex-shrink: 0;
  cursor: pointer;
}

.program-record__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #1a1a1a;
  outline: none;
}

.program-record__search-input::placeholder {
  color: #b0b0b0;
}

.program-record__filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf1f7;
  box-sizing: border-box;
}

.program-record__filter {
  width: 120px;
  height: 30px;
  padding: 0;
  border: 0.66px solid #d8d8d8;
  border-radius: 7.86px;
  background: #eaedf1;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.program-record__filter.is-active {
  background: rgba(54, 83, 160, 0.7);
  border-color: rgba(54, 83, 160, 0.7);
  color: #fff;
  font-weight: 600;
}

.program-record__list {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  box-sizing: border-box;
}

.program-record__day + .program-record__day {
  margin-top: 8px;
}

.program-record__day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px 10px;
}

.program-record__day-title {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.program-record__day-count {
  font-size: 12px;
  color: #94a3b8;
}

.program-record__item {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #edf1f7;
  box-sizing: border-box;
}

.program-record__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.program-record__item-name-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.program-record__item-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.program-record__item-warn {
  color: #e6a23c;
  font-size: 14px;
  flex-shrink: 0;
}

.program-record__item-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.program-record__item-status .iconfont {
  font-size: 15px;
  line-height: 1;
}

.program-record__item-status.is-success {
  color: #39b54a;
}

.program-record__item-status.is-fail {
  color: #f53f3f;
}

.program-record__item-status.is-muted {
  color: #909399;
}

.program-record__item-meta {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.program-record__item-meta .iconfont {
  font-size: 14px;
}

.program-record__item-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.program-record__item-time {
  font-size: 13px;
  color: #909399;
  min-width: 0;
}

.program-record__detail-btn {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.program-record__detail-btn:hover {
  color: #2f4a90;
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
.program-record-dialog.el-dialog {
  width: 678px !important;
  height: 968px !important;
  max-height: 968px !important;
  margin-top: 0 !important;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
}

.program-record-dialog .el-dialog__header {
  margin-right: 0;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #edf1f7;
  flex-shrink: 0;
  cursor: move;
  user-select: none;
}

.program-record-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.program-record-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.program-record-dialog .el-dialog__headerbtn {
  right: 20px;
}
</style>
