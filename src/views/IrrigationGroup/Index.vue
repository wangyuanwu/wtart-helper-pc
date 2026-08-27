<template>
  <div class="group-page" @click="clearLandMenu">
    <!-- 空态 -->
    <div v-if="showEmpty" class="group-empty">
      <img
        class="group-empty__img"
        src="@/assets/irrigation-group/group-empty.png"
        alt=""
      />
      <p class="group-empty__text">嗨！您还没有轮灌组</p>
      <button type="button" class="group-empty__btn" @click.stop="onAddGroup">
        添加轮灌组
      </button>
    </div>

    <!-- 有数据：按地块分组 -->
    <template v-else-if="landList != null">
      <div class="group-page-header">
        <div class="group-page-header__row">
          <h2 class="group-page-header__title">轮灌组列表</h2>
          <el-button
            type="primary"
            class="group-toolbar__add"
            @click.stop="onAddGroup"
          >
            <span class="group-toolbar__add-icon">+</span>
            添加轮灌组
          </el-button>
        </div>

        <div class="group-page-header__panel">
          <div class="group-search">
            <i
              class="iconfont icon-farm_ic_search group-search__icon"
              @click="handleSearchClick"
            ></i>
            <input
              v-model="searchText"
              class="group-search__input"
              type="text"
              placeholder="输入轮灌组名称"
              @input="handleSearchInput"
              @keyup.enter="handleSearchClick"
            />
            <i
              v-if="searchText"
              class="iconfont icon-shanchu group-search__clear"
              @click="clearSearch"
            ></i>
          </div>

          <div class="group-filter">
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
          </div>
        </div>
      </div>

      <div class="group-scroll">
        <section
          v-for="land in filterLandList"
          :key="land.landId ?? land.landName"
          class="group-land"
        >
          <div class="group-land__header">
            <div class="group-land__title">
              <span class="group-land__name">
                {{ land.landName || '未命名地块' }}
              </span>
              <el-popover
                v-if="land.landId != null"
                :visible="landMenuLandId === String(land.landId)"
                placement="bottom-start"
                :width="168"
                trigger="manual"
                :show-arrow="false"
                popper-class="group-land-menu-popper"
                @update:visible="(v) => onLandMenuVisible(land, v)"
              >
                <template #reference>
                  <button
                    type="button"
                    class="group-land__more-btn"
                    @click.stop="toggleLandMenu(land)"
                  >
                    <el-icon><MoreFilled /></el-icon>
                  </button>
                </template>
                <div class="group-land-menu" @click.stop>
                  <button
                    type="button"
                    class="group-land-menu__item"
                    @click.stop="onSortLand(land)"
                  >
                    <el-icon class="group-land-menu__icon"><Operation /></el-icon>
                    排序
                  </button>
                  <button
                    type="button"
                    class="group-land-menu__item"
                    @click.stop="onEditLand(land)"
                  >
                    <i class="iconfont icon-a-device_ic_edit1"></i>
                    编辑
                  </button>
                  <button
                    type="button"
                    class="group-land-menu__item is-danger"
                    @click.stop="onDeleteLand(land)"
                  >
                    <i class="iconfont icon-land_ic_dele"></i>
                    删除
                  </button>
                </div>
              </el-popover>
            </div>
          </div>

          <div class="group-grid">
            <article
              v-for="item in land.groups"
              :key="item.id"
              class="group-card"
              @click="onGroupClick(item)"
            >
              <div class="group-card__header">
                <div class="group-card__title-wrap">
                  <h3 class="group-card__name">
                    {{ item.name || '未命名轮灌组' }}
                  </h3>
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
                    <span class="group-card__batch-badge">{{
                      item.localLetter
                    }}</span>
                  </template>
                  <template v-else>
                    <span class="group-card__batch-badge">{{
                      item.localLetter
                    }}</span>
                    <span>{{ item.localPercent }}</span>
                  </template>
                </button>
              </div>

              <div
                v-if="isScheduleEmpty(item)"
                class="group-card__schedule-empty"
              >
                <i
                  class="iconfont icon-device_ic_calendar group-card__schedule-icon"
                ></i>
                <span>暂无排期任务</span>
              </div>

              <div v-else class="group-card__stats">
                <div v-if="showNextRun(item)" class="group-card__stat">
                  <div class="group-card__stat-label">下次启动时间</div>
                  <div class="group-card__stat-value is-accent">
                    {{ formatNextRun(item) }}
                  </div>
                </div>
                <div v-if="showRunDuration(item)" class="group-card__stat">
                  <div class="group-card__stat-label">灌溉时长</div>
                  <div class="group-card__stat-value is-accent">
                    {{ getRunTimeText(item) }}
                  </div>
                </div>
                <div v-if="showPlanDuration(item)" class="group-card__stat">
                  <div class="group-card__stat-label">计划时长</div>
                  <div class="group-card__stat-value is-accent">
                    {{ formatPlanDuration(item) }}
                  </div>
                </div>
                <div v-if="showProgram(item)" class="group-card__stat">
                  <div class="group-card__stat-label">轮灌程序</div>
                  <div class="group-card__stat-value">
                    {{ resolveProgramName(item) }}
                  </div>
                </div>
                <div v-if="showModeStat(item)" class="group-card__stat">
                  <div class="group-card__stat-label">启动方式</div>
                  <div class="group-card__stat-value">
                    {{ getRunText(item) }}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </template>

    <div v-else-if="loading" class="group-loading">加载中...</div>

    <GroupOrderDialog
      v-model="sortDialogVisible"
      :farm-id="getFarmId()"
      :land-id="sortLandId"
      @saved="onSortSaved"
    />

    <el-dialog
      v-model="landDeleteConfirmVisible"
      title="提示"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onLandDeleteConfirmClosed"
    >
      <p class="group-land-delete-desc">删除地块后不能恢复，是否继续？</p>
      <el-checkbox v-model="landDeleteRiskChecked">
        已知晓风险，确认删除。
      </el-checkbox>
      <template #footer>
        <el-button @click="landDeleteConfirmVisible = false">取消</el-button>
        <el-button
          type="danger"
          :disabled="!landDeleteRiskChecked"
          :loading="landDeleting"
          @click="confirmDeleteLand"
        >
          删除
        </el-button>
      </template>
    </el-dialog>

    <LandEmptyDialog
      v-model="landEmptyVisible"
      @create="onCreateLandFromEmpty"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MoreFilled, Operation } from '@element-plus/icons-vue'
import { confirmWaterOutletRisk } from '@/composables/useWaterOutletRiskDialog'
import { useFarmStore } from '@/store/farm'
import { second2Time } from '@/utils/programTime'
import { deleteLand, getLandPlotById } from '@/api/map'
import {
  closeAllWaterDv,
  getGroupListByLand,
  openAllWaterDv
} from '@/api/irrigationGroup'
import GroupOrderDialog from './GroupOrderDialog.vue'
import LandEmptyDialog from '@/views/Map/LandEmptyDialog.vue'

const router = useRouter()
const farmStore = useFarmStore()

/** 按地块分组列表（对齐移动端 landList） */
const landList = ref(null)
const loading = ref(false)
const tabIndex = ref(0)
const searchText = ref('')
/** 实际请求参数，对齐移动端 searchTextCache */
const searchTextCache = ref('')
const runTick = ref(0)

const landMenuLandId = ref(null)
const sortDialogVisible = ref(false)
const sortLandId = ref(null)
const landDeleteConfirmVisible = ref(false)
const landDeleteRiskChecked = ref(false)
const landDeleting = ref(false)
const pendingDeleteLand = ref(null)
const landEmptyVisible = ref(false)

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

const allGroups = computed(() => {
  const arr = []
  ;(landList.value || []).forEach((land) => {
    if (Array.isArray(land.groups)) arr.push(...land.groups)
  })
  return arr
})

const totalCount = computed(() => allGroups.value.length)

const runningCount = computed(
  () => allGroups.value.filter((item) => (item.portOpeningCnt ?? 0) > 0).length
)

const stopCount = computed(
  () =>
    allGroups.value.filter((item) => !((item.portOpeningCnt ?? 0) > 0)).length
)

const tabList = computed(() => [
  { key: 'all', label: `全部(${totalCount.value})` },
  { key: 'running', label: `在运行(${runningCount.value})` },
  { key: 'stopped', label: `未运行(${stopCount.value})` }
])

const showEmpty = computed(() => {
  if (landList.value == null) return false
  return totalCount.value <= 0
})

/** 按 Tab 筛选后的地块列表（空组地块隐藏，对齐移动端 filterLandList） */
const filterLandList = computed(() => {
  const src = landList.value || []
  return src
    .map((land) => {
      let groups = [...(land.groups || [])]
      if (tabIndex.value === 1) {
        groups = groups.filter((item) => (item.portOpeningCnt ?? 0) > 0)
      } else if (tabIndex.value === 2) {
        groups = groups.filter((item) => !((item.portOpeningCnt ?? 0) > 0))
      }
      return { ...land, groups }
    })
    .filter((land) => land.groups.length > 0)
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
    if (tiggerObject == 2) return '自动轮灌'
    if (mode == 0) return '手动'
    if (mode == 1) return '定时'
    return null
  }

  if (item.deviceRuntime != null) {
    if ((item.portOpeningCnt ?? 0) > 0) {
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
  item?.programName ?? item?.deviceRuntime?.programName ?? '--'

const isScheduleEmpty = (item) => !item.deviceRuntime && !item.deviceNexRunTime

const showNextRun = (item) =>
  item.deviceNexRunTime?.nextRunTime != null &&
  !(
    (item.portOpeningCnt ?? 0) > 0 &&
    item.deviceRuntime &&
    item.localSwitch
  )

const showRunDuration = (item) =>
  !!(
    item.deviceRuntime &&
    (item.portOpeningCnt ?? 0) > 0 &&
    item.localSwitch
  )

/** 对齐移动端：未运行且有计划时长时展示 */
const showPlanDuration = (item) =>
  item.deviceNexRunTime?.duration != null &&
  (!item.deviceRuntime || !item.deviceRuntime.isRunning)

const formatPlanDuration = (item) =>
  second2Time(item.deviceNexRunTime?.duration)

const showProgram = (item) => {
  const t = resolveTiggerObject(item)
  const name = resolveProgramName(item)
  return (t == 2 || t == 3) && !!name && name !== '--'
}

const showModeStat = (item) => {
  if (isScheduleEmpty(item)) return false
  if (showNextRun(item) && showProgram(item)) return false
  if (showRunDuration(item) && showProgram(item)) return false
  return !!(item.deviceRuntime || item.deviceNexRunTime)
}

const formatNextRun = (item) =>
  formatUtc(item.deviceNexRunTime?.nextRunTime, 'mdhms') || '--'

/** 对齐移动端：以开阀口数判断运行态 */
const getStatus = (item) => (item.portOpeningCnt ?? 0) > 0

const getLetter = (item) =>
  `${item.portOpeningCnt ?? 0}/${item.protTotal ?? 0}`

const getPercent = (item) => (getStatus(item) ? '批量关' : '批量开')

const isBatchLocked = (item) => {
  const lockUntil = item.lockUntil
  return lockUntil != null && lockUntil > Date.now()
}

const findGroup = (waterId) => {
  for (const land of landList.value || []) {
    const g = (land.groups || []).find(
      (x) => String(x.id) === String(waterId)
    )
    if (g) return g
  }
  return null
}

const updateLockUntil = (waterId, time) => {
  const target = findGroup(waterId)
  if (target) target.lockUntil = time
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

const mergeLandList = (oldLandList, newLandList) => {
  const oldGroupsMap = new Map()
  ;(oldLandList || []).forEach((land) => {
    ;(land.groups || []).forEach((g) => {
      oldGroupsMap.set(String(g.id), g)
    })
  })

  return (newLandList || []).map((land) => ({
    ...land,
    groups: (land.groups || []).map((g) =>
      mergeItemState(g, oldGroupsMap.get(String(g.id)) || null)
    )
  }))
}

const ensureRunTick = () => {
  if (runTickTimer) return
  const hasRunning = allGroups.value.some(
    (item) => (item.portOpeningCnt ?? 0) > 0 && item.deviceRuntime
  )
  if (!hasRunning) return
  runTickTimer = setInterval(() => {
    runTick.value += 1
    const stillRunning = allGroups.value.some(
      (item) => (item.portOpeningCnt ?? 0) > 0 && item.deviceRuntime
    )
    if (!stillRunning) clearRunTick()
  }, 1000)
}

const clearRunTick = () => {
  if (runTickTimer) {
    clearInterval(runTickTimer)
    runTickTimer = null
  }
}

const fetchGroupList = async ({ silent = false, isSearch: searchAction = false } = {}) => {
  const farmId = getFarmId()
  if (farmId == null) {
    landList.value = []
    return
  }

  if (searchAction) {
    searchTextCache.value = searchText.value
  }

  const requestId = ++listRequestId
  if (!silent && landList.value == null) loading.value = true

  try {
    const res = await getGroupListByLand(
      {
        farmId,
        searchText: searchTextCache.value
      },
      { silent }
    )
    if (requestId !== listRequestId) return

    const newData = Array.isArray(res?.data) ? res.data : []
    if (landList.value == null || searchAction || !silent) {
      landList.value = newData.map((land) => ({
        ...land,
        groups: (land.groups || []).map((g) => mergeItemState(g, null))
      }))
    } else {
      landList.value = mergeLandList(landList.value, newData)
    }
    ensureRunTick()
  } catch (e) {
    if (requestId !== listRequestId) return
    console.error('[IrrigationGroup] 获取轮灌组列表失败', e)
    if (landList.value == null) landList.value = []
  } finally {
    if (requestId === listRequestId) loading.value = false
  }
}

const openAllWaterDvHttp = async (order, waterId) => {
  try {
    const res = await openAllWaterDv(order)
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      updateLockUntil(waterId, Date.now() + LOCK_SECONDS * 1000)
    } else {
      updateLockUntil(waterId, 0)
      await fetchGroupList({ silent: true })
    }
  } catch (e) {
    updateLockUntil(waterId, 0)
    await fetchGroupList({ silent: true })
    console.error('[IrrigationGroup] 批量开失败', e)
  }
}

/** 对齐移动端 closeAllWaterDvHttp：40102 → 强制关闭确认 */
const closeAllWaterDvHttp = async (closeOrder, waterId) => {
  try {
    await closeAllWaterDv(closeOrder, { silent: true })
    ElMessage.success('操作成功')
    updateLockUntil(waterId, Date.now() + LOCK_SECONDS * 1000)
  } catch (e) {
    const code = e?.code
    if (code === 40102 && !closeOrder.force) {
      const ok = await confirmWaterOutletRisk({
        message: e?.message
          ? `${e.message}是否强制关闭？`
          : '是否强制关闭？',
        confirmText: '强制关闭'
      })
      if (ok) {
        await closeAllWaterDvHttp({ ...closeOrder, force: true }, waterId)
      } else {
        updateLockUntil(waterId, 0)
        await fetchGroupList({ silent: true })
      }
      return
    }
    updateLockUntil(waterId, 0)
    await fetchGroupList({ silent: true })
    if (code !== 40102) {
      ElMessage.error(e?.message || '批量关失败')
    }
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
    closeAllWaterDvHttp({ force: false, id: item.id }, item.id)
  }
}

const onChangeTab = () => {}

/** 对齐移动端 inputBack：输入清空时重新拉列表 */
const handleSearchInput = () => {
  if (searchText.value === '') {
    fetchGroupList({ silent: false, isSearch: true })
  }
}

/** 点击清空图标：与手动清空输入框行为一致 */
const clearSearch = () => {
  searchText.value = ''
  handleSearchInput()
}

/** 对齐移动端 getGroupListLandHttp(true,true)：点击搜索 / 回车 */
const handleSearchClick = () => {
  fetchGroupList({ silent: false, isSearch: true })
}

/** 添加轮灌组：对齐移动端 group_empty / toAddLand → map-edit-group?from=home */
const onAddGroup = async () => {
  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }
  try {
    let info = farmStore.s_farm_info
    if (!info || info.id !== farmId) {
      info = await farmStore.fetchFarmFullInfo(farmId)
    }
    const lands = info?.lands
    if (!Array.isArray(lands) || lands.length <= 0) {
      landEmptyVisible.value = true
      return
    }
    router.push({ path: '/map/edit-group', query: { from: 'home' } })
  } catch (e) {
    console.error('[IrrigationGroup] 添加轮灌组前置校验失败', e)
    ElMessage.error('获取农场信息失败')
  }
}

const onCreateLandFromEmpty = () => {
  landEmptyVisible.value = false
  router.push({ path: '/map/edit-plot', query: { type: 'add' } })
}

const onGroupClick = (item) => {
  if (!item?.id) return
  farmStore.setGroupListItem(item)
  router.push({
    path: '/irrigation-group/detail',
    query: { id: String(item.id) }
  })
}

const clearLandMenu = () => {
  landMenuLandId.value = null
}

const onLandMenuVisible = (land, visible) => {
  landMenuLandId.value = visible ? String(land.landId) : null
}

const toggleLandMenu = (land) => {
  const id = String(land.landId)
  landMenuLandId.value = landMenuLandId.value === id ? null : id
}

/** 同地块轮灌组排序（对齐移动端 pop_order_group） */
const onSortLand = (land) => {
  landMenuLandId.value = null
  if (land?.landId == null) return
  sortLandId.value = land.landId
  sortDialogVisible.value = true
}

const onSortSaved = async () => {
  await fetchGroupList({ silent: false })
}

/** 编辑地块：对齐设备页 / 移动端 → farm/edit-land?type=edit */
const onEditLand = async (land) => {
  landMenuLandId.value = null
  if (land?.landId == null) return
  try {
    const res = await getLandPlotById(land.landId)
    if (res?.data) {
      farmStore.setLand(res.data)
      router.push({
        path: '/farm/edit-land',
        query: { type: 'edit', from: 'irrigation-group' }
      })
    }
  } catch (e) {
    console.error('[IrrigationGroup] 获取地块详情失败', e)
    ElMessage.error('获取地块详情失败')
  }
}

const onDeleteLand = (land) => {
  if (land?.landId == null) return
  landMenuLandId.value = null
  pendingDeleteLand.value = land
  landDeleteRiskChecked.value = false
  landDeleteConfirmVisible.value = true
}

const onLandDeleteConfirmClosed = () => {
  pendingDeleteLand.value = null
  landDeleteRiskChecked.value = false
}

const confirmDeleteLand = async () => {
  const land = pendingDeleteLand.value
  if (land?.landId == null) return
  landDeleting.value = true
  try {
    await deleteLand(land.landId)
    ElMessage.success('操作成功')
    landDeleteConfirmVisible.value = false
    await farmStore.fetchFarmList()
    await fetchGroupList({ silent: false })
  } catch (e) {
    console.error('[IrrigationGroup] 删除地块失败', e)
  } finally {
    landDeleting.value = false
  }
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
  landList.value = null
  tabIndex.value = 0
  clearLandMenu()
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

.group-page-header {
  flex-shrink: 0;
  padding: 16px 20px 0;
}

.group-page-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.group-page-header__title {
  margin: 0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 22px;
  font-weight: bold;
  color: #0f172a;
  line-height: 1.4;
}

.group-page-header__panel {
  height: 152px;
  border-radius: 12px;
  background: #fff;
  padding: 26px 16px 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-search {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  margin: 0;
  padding: 0 12px;
  border-radius: 6px;
  background: #f7f7f7;
  box-sizing: border-box;
}

.group-filter {
  flex-shrink: 0;
  align-self: flex-start;
  max-width: 100%;
  border-radius: 11.6px;
  background: #edf1f6;
  overflow: hidden;
}

.group-search__icon {
  font-size: 18px;
  color: #8c8c8c;
  flex-shrink: 0;
  cursor: pointer;
}

.group-search__icon:hover {
  color: #595959;
}

.group-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1a1a1a;
}

.group-search__input::placeholder {
  color: #b0b0b0;
}

.group-search__clear {
  font-size: 14px;
  color: #b0b0b0;
  flex-shrink: 0;
  cursor: pointer;
}

.group-search__clear:hover {
  color: #8c8c8c;
}

.group-tabs {
  display: inline-flex;
  align-items: stretch;
  width: auto;
  max-width: 100%;
  height: 48.4px;
  box-sizing: border-box;
  padding: 5px 10px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.group-tabs :deep(.el-radio-button) {
  flex: 0 0 auto;
  min-width: 88px;
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
  padding: 0 10px !important;
  border: 0 !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  outline: none !important;
  outline-offset: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  font-weight: bold;
  line-height: 20px;
  text-align: center;
  display: flex !important;
  align-items: center;
  justify-content: center;
  letter-spacing: 0;
  color: #3653a0;
  vertical-align: middle;
  white-space: nowrap;
}

.group-tabs :deep(.el-radio-button__inner:hover) {
  color: #3653a0;
}

.group-tabs :deep(.el-radio-button.is-active .el-radio-button__inner),
.group-tabs :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3653a0 !important;
  color: #fff !important;
  font-weight: bold;
  border: 0 !important;
  border-radius: 7px !important;
  outline: none !important;
  box-shadow: none !important;
}

.group-tabs :deep(.el-radio-button:first-child .el-radio-button__inner),
.group-tabs :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 !important;
}

.group-tabs :deep(.el-radio-button.is-active:first-child .el-radio-button__inner),
.group-tabs :deep(.el-radio-button.is-active:last-child .el-radio-button__inner),
.group-tabs
  :deep(
    .el-radio-button:first-child
      .el-radio-button__original-radio:checked
      + .el-radio-button__inner
  ),
.group-tabs
  :deep(
    .el-radio-button:last-child
      .el-radio-button__original-radio:checked
      + .el-radio-button__inner
  ) {
  border-radius: 7px !important;
}

.group-tabs :deep(.el-radio-button + .el-radio-button) {
  margin-left: 0;
}

.group-tabs :deep(.el-radio-button__original-radio:focus-visible + .el-radio-button__inner) {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
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
  line-height: 24px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.4px;
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
  line-height: 24px;
  letter-spacing: 0.4px;
}

.group-scroll {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 24px;
}

.group-land {
  margin-top: 16px;
}

.group-land__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  min-height: 40px;
}

.group-land__title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.group-land__name {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-land__more-btn {
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #606266;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* 暂时隐藏三点菜单，恢复时删除以下样式 */
  visibility: hidden;
  width: 0;
  height: 0;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

.group-land__more-btn:hover {
  background: #eef2f7;
  color: #3653a0;
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
  font-size: 14px;
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

.group-land-menu {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.group-land-menu__item {
  border: none;
  background: transparent;
  height: 40px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.group-land-menu__item:hover {
  background: #f5f7fa;
}

.group-land-menu__item.is-danger {
  color: #f56c6c;
}

.group-land-menu__item .iconfont,
.group-land-menu__item .group-land-menu__icon {
  font-size: 16px;
}

.group-land-delete-desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
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
