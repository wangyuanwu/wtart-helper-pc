<template>
  <div class="alarm-page">
    <div class="alarm-page__head">
      <h1 class="alarm-page__title">预警信息</h1>
      <button
        type="button"
        class="alarm-page__setting"
        title="告警设置"
        @click="onAlarmSet"
      >
        <i class="iconfont icon-shezhi"></i>
      </button>
    </div>

    <div class="alarm-page__toolbar">
      <div class="alarm-page__search">
        <input
          v-model="searchText"
          class="alarm-page__search-input"
          type="text"
          placeholder="输入标题/设备名称/设备编号"
          @keyup.enter="onSearch"
          @input="onSearchInput"
        />
        <button type="button" class="alarm-page__search-btn" @click="onSearch">
          <i class="iconfont icon-farm_ic_search"></i>
        </button>
      </div>
      <div class="alarm-page__filters">
        <button
          type="button"
          class="alarm-page__filter"
          :class="{ 'is-active': choseIndex === 0 }"
          @click="changeFilter(0)"
        >
          全部
        </button>
        <button
          type="button"
          class="alarm-page__filter"
          :class="{ 'is-active': choseIndex === 1 }"
          @click="changeFilter(1)"
        >
          未解除
        </button>
      </div>
    </div>

    <div
      ref="listRef"
      v-loading="loading && pageIndex === 1"
      class="alarm-page__body"
      @scroll="onListScroll"
    >
      <div v-if="showList.length" class="alarm-page__grid">
        <article
          v-for="item in showList"
          :key="item.id"
          class="alarm-card"
          :class="{ 'is-resolved': item.status === 1 }"
        >
          <div class="alarm-card__head">
            <span class="alarm-card__name">{{ item.deviceName || '--' }}</span>
            <i
              class="iconfont icon-radio alarm-card__dot"
              :class="[0, 2].includes(item.status) ? 'is-warn' : 'is-ok'"
            ></i>
          </div>
          <div class="alarm-card__id">设备ID:{{ item.deviceCode || '--' }}</div>
          <div class="alarm-card__event">事件:{{ item.eventDescription || '--' }}</div>
          <div class="alarm-card__foot">
            <div class="alarm-card__time">
              <div>{{ formatAlarmTime(item.alarmTime) }}</div>
              <div v-if="item.status === 1">
                {{ formatAlarmTime(item.resolvedTime) }} 解除
              </div>
            </div>
            <div class="alarm-card__actions">
              <button
                v-if="item.status !== 0"
                type="button"
                class="alarm-card__btn is-delete"
                @click="onDelete(item)"
              >
                <i class="iconfont icon-land_ic_dele"></i>
                <span>删除</span>
              </button>
              <button
                v-if="item.status === 0"
                type="button"
                class="alarm-card__btn is-handle"
                @click="onHandle(item)"
              >
                <i class="iconfont icon-radio"></i>
                <span>设置为已处理</span>
              </button>
            </div>
          </div>
          <div v-if="item.status === 1" class="alarm-card__pass">已处理</div>
        </article>
      </div>

      <div v-else-if="!loading" class="alarm-page__empty">暂无预警数据</div>

      <div v-if="loading && pageIndex > 1" class="alarm-page__foot-tip">
        加载中...
      </div>
      <div
        v-else-if="noMore && !loading && showList.length > 0"
        class="alarm-page__foot-tip"
      >
        没有更多数据了
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 预警信息页
 * 对齐移动端 pages/home/activity/alarm/alarm_record
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deletedAlarm, getAlarmList, handleAlarm } from '@/api/alarm'
import { useFarmStore } from '@/store/farm'

const router = useRouter()
const farmStore = useFarmStore()

const PAGE_SIZE = 100

const searchText = ref('')
const choseIndex = ref(0)
const pageIndex = ref(1)
const totalPage = ref(0)
const allRawList = ref([])
const loading = ref(false)
const listRef = ref(null)

let offFarmChange = null

const getFarmId = () =>
  farmStore.selectFarm?.id ?? farmStore.s_selectFarm?.id ?? null

const noMore = computed(
  () => totalPage.value > 0 && pageIndex.value >= totalPage.value
)

const showList = computed(() => {
  if (choseIndex.value === 1) {
    return allRawList.value.filter((item) => item.status === 0)
  }
  return allRawList.value
})

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 对齐移动端 formatUtcCustom MM-dd hh:mm:ss */
function formatAlarmTime(utcStr) {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function changeFilter(type) {
  choseIndex.value = type
}

async function fetchList(isReset = false) {
  const farmId = getFarmId()
  if (farmId == null) {
    allRawList.value = []
    return
  }
  if (loading.value) return

  loading.value = true
  if (isReset) {
    pageIndex.value = 1
    allRawList.value = []
    totalPage.value = 0
  }

  try {
    const res = await getAlarmList(
      {
        FarmId: farmId,
        keyword: searchText.value.trim(),
        PageIndex: pageIndex.value,
        PageSize: PAGE_SIZE
      },
      { silent: pageIndex.value > 1 }
    )
    const curr = Array.isArray(res?.data?.result) ? res.data.result : []
    totalPage.value = Number(res?.data?.totalPage) || 0
    allRawList.value = isReset ? curr : [...allRawList.value, ...curr]
  } catch (e) {
    console.error('[Alarm] 获取预警列表失败', e)
    if (isReset) allRawList.value = []
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (loading.value || noMore.value) return
  pageIndex.value += 1
  fetchList(false)
}

function onListScroll(e) {
  const el = e.target
  if (!el || loading.value || noMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}

function onSearch() {
  fetchList(true)
}

function onSearchInput() {
  if (!searchText.value.trim()) {
    fetchList(true)
  }
}

async function onHandle(item) {
  if (!item?.id) return
  try {
    await handleAlarm({ id: item.id }, { silent: true })
    ElMessage.success('操作成功')
    await fetchList(true)
  } catch (e) {
    console.error('[Alarm] 处理失败', e)
    ElMessage.error(e?.message || '操作失败')
  }
}

async function onDelete(item) {
  if (!item?.id) return
  try {
    await ElMessageBox.confirm('请确定是否删除该报警？', '删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deletedAlarm(item.id, { silent: true })
    ElMessage.success('操作成功')
    await fetchList(true)
  } catch (e) {
    console.error('[Alarm] 删除失败', e)
    ElMessage.error(e?.message || '删除失败')
  }
}

function onAlarmSet() {
  router.push({ path: '/alarm/set' })
}

onMounted(() => {
  fetchList(true)
  offFarmChange = farmStore.onFarmChange(() => {
    searchText.value = ''
    choseIndex.value = 0
    fetchList(true)
  })
})

onUnmounted(() => {
  offFarmChange?.()
})

watch(
  () => getFarmId(),
  (id, prev) => {
    if (id != null && String(id) !== String(prev)) {
      fetchList(true)
    }
  }
)
</script>

<style scoped>
.alarm-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
  box-sizing: border-box;
  padding: 16px 20px 20px;
}

.alarm-page__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.alarm-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.alarm-page__setting {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #fff;
  color: #3653a0;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.alarm-page__setting .iconfont {
  font-size: 20px;
  line-height: 1;
}

.alarm-page__setting:hover {
  background: #f5f7fa;
}

.alarm-page__toolbar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.04);
}

.alarm-page__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f5f7fa;
}

.alarm-page__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.alarm-page__search-btn {
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  padding: 4px;
}

.alarm-page__filters {
  display: flex;
  gap: 10px;
}

.alarm-page__filter {
  padding: 6px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 18px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}

.alarm-page__filter.is-active {
  border-color: #3653a0;
  background: #3653a0;
  color: #fff;
}

.alarm-page__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.alarm-page__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.alarm-card {
  position: relative;
  padding: 16px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
  overflow: hidden;
}

.alarm-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.alarm-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-card__dot {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

.alarm-card__dot.is-warn {
  color: #f53f3f;
}

.alarm-card__dot.is-ok {
  color: #39b54a;
}

.alarm-card__id {
  margin-top: 8px;
  font-size: 13px;
  color: #303133;
}

.alarm-card__event {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
  min-height: 40px;
}

.alarm-card__foot {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #edf1f7;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.alarm-card__time {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.alarm-card__actions {
  flex-shrink: 0;
}

.alarm-card__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.alarm-card__btn .iconfont {
  font-size: 13px;
  line-height: 1;
}

.alarm-card__btn.is-delete {
  background: #fef0f0;
  color: #f56c6c;
}

.alarm-card__btn.is-handle {
  background: #e8f8ef;
  color: #00a85a;
}

.alarm-card__pass {
  position: absolute;
  right: 12px;
  bottom: 56px;
  padding: 2px 8px;
  border: 1px solid rgba(57, 181, 74, 0.45);
  border-radius: 4px;
  color: rgba(57, 181, 74, 0.75);
  font-size: 12px;
  font-weight: 700;
  transform: rotate(-18deg);
  pointer-events: none;
}

.alarm-page__empty,
.alarm-page__foot-tip {
  padding: 40px 16px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

@media (max-width: 1400px) {
  .alarm-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .alarm-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
