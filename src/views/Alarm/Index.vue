<template>
  <div class="alarm-page">
    <div class="alarm-page__head">
      <h1 class="alarm-page__title">预警信息</h1>
      <button
        type="button"
        class="alarm-page__setting"
        title="报警设置"
        @click="onAlarmSet"
      >
        <i class="iconfont icon-shezhi"></i>
        <span>报警设置</span>
      </button>
    </div>

    <div class="alarm-page__toolbar">
      <div class="alarm-page__search">
        <i
          class="iconfont icon-farm_ic_search alarm-page__search-icon"
          @click="onSearch"
        ></i>
        <input
          v-model="searchText"
          class="alarm-page__search-input"
          type="text"
          placeholder="输入标题/设备名称/设备编号"
          @keyup.enter="onSearch"
          @input="onSearchInput"
        />
      </div>
      <div class="alarm-page__filters">
        <el-radio-group v-model="choseIndex" class="alarm-page__tabs">
          <el-radio-button
            v-for="(tab, idx) in filterTabs"
            :key="tab.key"
            :value="idx"
          >
            {{ tab.label }}
          </el-radio-button>
        </el-radio-group>
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
          :class="{ 'is-resolved': isResolvedAlarm(item) }"
        >
          <div class="alarm-card__head">
            <div class="alarm-card__title-wrap">
              <span class="alarm-card__title">{{ getAlarmBrief(item) }}</span>
              <span
                v-if="!isResolvedAlarm(item)"
                class="alarm-card__warn-dot"
                aria-hidden="true"
              ></span>
            </div>
            <span class="alarm-card__head-time">
              {{
                isResolvedAlarm(item)
                  ? formatAlarmTime(item.resolvedTime)
                  : formatAlarmTime(item.alarmTime)
              }}
            </span>
          </div>

          <div class="alarm-card__rows">
            <div class="alarm-card__row alarm-card__row--name">
              <span class="alarm-card__value is-name">
                <template v-if="item.deviceId">{{ item.deviceName || '--' }}</template>
              </span>
            </div>
            <div class="alarm-card__row alarm-card__row--id">
              <template v-if="item.deviceId">
                <span class="alarm-card__label">设备ID</span>
                <span class="alarm-card__value is-device-id">
                  {{ item.deviceCode || '--' }}
                </span>
              </template>
            </div>
            <div class="alarm-card__row alarm-card__row--desc">
              <span class="alarm-card__label">事件描述</span>
              <span class="alarm-card__value is-desc">
                {{ item.eventDescription || '--' }}
              </span>
            </div>
          </div>

          <div class="alarm-card__foot">
            <img
              v-if="isResolvedAlarm(item)"
              class="alarm-card__stamp"
              :src="resolvedStampIcon"
              alt="已解除"
            />
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
                <span>设置为已处理</span>
              </button>
            </div>
          </div>
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
import resolvedStampIcon from '@/assets/alarm/alarm-resolved-stamp.svg'

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

const totalCount = computed(() => allRawList.value.length)

const unresolvedCount = computed(
  () => allRawList.value.filter((item) => item.status === 0).length
)

const filterTabs = computed(() => [
  { key: 'all', label: `全部 (${totalCount.value})` },
  { key: 'unresolved', label: `未解除 (${unresolvedCount.value})` }
])

const showList = computed(() => {
  if (choseIndex.value === 1) {
    return allRawList.value.filter((item) => item.status === 0)
  }
  return allRawList.value
})

function pad2(n) {
  return String(n).padStart(2, '0')
}

function isResolvedAlarm(item) {
  return item?.status === 1
}

function getAlarmBrief(item) {
  return (
    item?.title ||
    item?.alarmTitle ||
    item?.briefDescription ||
    item?.eventDescription ||
    '--'
  )
}

/** 对齐移动端 formatUtcCustom MM-dd hh:mm:ss */
function formatAlarmTime(utcStr) {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
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
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: #3653a0;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.alarm-page__setting .iconfont {
  font-size: 16px;
  line-height: 1;
  color: #fff;
}

.alarm-page__setting:hover {
  background: #2d4590;
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
  height: 40px;
  padding: 0 12px;
  border-radius: 6px;
  background: #f7f7f7;
  box-sizing: border-box;
}

.alarm-page__search-icon {
  font-size: 18px;
  color: #8c8c8c;
  flex-shrink: 0;
  cursor: pointer;
}

.alarm-page__search-icon:hover {
  color: #595959;
}

.alarm-page__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #1a1a1a;
  outline: none;
}

.alarm-page__search-input::placeholder {
  color: #b0b0b0;
}

.alarm-page__filters {
  flex-shrink: 0;
  align-self: flex-start;
  max-width: 100%;
  border-radius: 11.6px;
  background: #edf1f6;
  overflow: hidden;
}

.alarm-page__tabs {
  display: inline-flex;
  align-items: stretch;
  width: auto;
  max-width: 100%;
  height: 40px;
  box-sizing: border-box;
  padding: 4px 8px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.alarm-page__tabs :deep(.el-radio-button) {
  flex: 0 0 auto;
  min-width: 96px;
  height: auto;
  margin: 0;
  display: flex !important;
  align-items: stretch;
  --el-radio-button-checked-bg-color: #3653a0;
  --el-radio-button-checked-text-color: #fff;
  --el-radio-button-checked-border-color: transparent;
  --el-border: none;
}

.alarm-page__tabs :deep(.el-radio-button__inner) {
  width: 100%;
  height: 100% !important;
  min-height: 0;
  padding: 0 12px !important;
  border: 0 !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  outline: none !important;
  outline-offset: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
  display: flex !important;
  align-items: center;
  justify-content: center;
  color: #3653a0;
  white-space: nowrap;
}

.alarm-page__tabs :deep(.el-radio-button__inner:hover) {
  color: #3653a0;
}

.alarm-page__tabs :deep(.el-radio-button.is-active .el-radio-button__inner),
.alarm-page__tabs
  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3653a0 !important;
  color: #fff !important;
  font-weight: 700;
  border: 0 !important;
  border-radius: 7px !important;
  outline: none !important;
  box-shadow: none !important;
}

.alarm-page__tabs :deep(.el-radio-button:first-child .el-radio-button__inner),
.alarm-page__tabs :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 !important;
}

.alarm-page__tabs
  :deep(.el-radio-button.is-active:first-child .el-radio-button__inner),
.alarm-page__tabs
  :deep(.el-radio-button.is-active:last-child .el-radio-button__inner),
.alarm-page__tabs
  :deep(
    .el-radio-button:first-child
      .el-radio-button__original-radio:checked
      + .el-radio-button__inner
  ),
.alarm-page__tabs
  :deep(
    .el-radio-button:last-child
      .el-radio-button__original-radio:checked
      + .el-radio-button__inner
  ) {
  border-radius: 7px !important;
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
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
  overflow: hidden;
}

.alarm-card.is-resolved {
  background: #FCFDFE;
  box-shadow: none;
}

.alarm-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.alarm-card__title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.alarm-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-card__warn-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff3b30 0%, #e02020 55%, rgba(224, 32, 32, 0.35) 100%);
  box-shadow: 0 0 4px rgba(255, 59, 48, 0.55);
}

.alarm-card__head-time {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: bold;
  line-height: 17.34px;
  letter-spacing: 0;
  color: #94a3b8;
  white-space: nowrap;
}

.alarm-card__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-bottom: 6px;
}

.alarm-card__row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 20px;
  line-height: 20px;
}

.alarm-card__label {
  flex-shrink: 0;
  width: 56px;
  font-size: 14px;
  font-weight: bold;
  color: #94a3b8;
}

.alarm-card__value {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.alarm-card__value.is-name {
  font-size: 14px;
  font-weight: bold;
  color: #1e293b;
}

.alarm-card__value.is-device-id {
  font-size: 13.88px;
  font-weight: bold;
  color: #3653a0;
}

.alarm-card__value.is-desc {
  font-size: 12px;
  font-weight: bold;
  color: #475569;
}

.alarm-card.is-resolved .alarm-card__label {
  color: #94a3b8;
}

.alarm-card.is-resolved .alarm-card__value.is-name {
  font-size: 14px;
  font-weight: bold;
  color: #475569;
}

.alarm-card.is-resolved .alarm-card__value.is-device-id {
  font-size: 14px;
  font-weight: bold;
  color: #64748b;
}

.alarm-card.is-resolved .alarm-card__value.is-desc {
  font-size: 14px;
  font-weight: bold;
  color: #94a3b8;
}

.alarm-card__foot {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  position: relative;
}

.alarm-card__stamp {
  flex-shrink: 0;
  width: 72px;
  height: auto;
  object-fit: contain;
  pointer-events: none;
  position: relative;
  z-index: 1;
  /* 上移覆盖内容区与按钮区之间的灰色分界线 */
  margin-top: -34px;
  margin-bottom: -6px;
  margin-right: 4px;
}

.alarm-card__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.alarm-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  padding: 0;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.alarm-card__btn .iconfont {
  font-size: 13px;
  line-height: 1;
}

.alarm-card__btn.is-delete {
  width: 81.23px;
  height: 33.61px;
  border-radius: 10.41px;
  background: #fff;
  border-color: #e4e7ed;
  color: #909399;
}

.alarm-card__btn.is-delete:hover {
  border-color: #dcdfe6;
  color: #606266;
}

.alarm-card__btn.is-handle {
  width: 108.42px;
  height: 33.61px;
  border-radius: 10.41px;
  background: #e8f8ef;
  border-color: #e8f8ef;
  color: #00a85a;
}

.alarm-card__btn.is-handle:hover {
  background: #dcf5e7;
}

.alarm-card.is-resolved .alarm-card__btn.is-delete {
  background: #fff;
  border-color: #e4e7ed;
  color: #a8abb2;
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
