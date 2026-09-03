<template>
  <div class="program-page">
    <!-- 空态：对齐移动端 ProEmpty，仅「无搜索关键字 + 列表为空」 -->
    <div v-if="showEmpty" class="program-empty">
      <img
        class="program-empty__img"
        src="@/assets/irrigation-group/group-empty.png"
        alt=""
      />
      <p class="program-empty__text">您还没有轮灌程序</p>
      <button type="button" class="program-empty__btn" @click="onAddProgram">
        添加轮灌程序
      </button>
    </div>

    <!-- 有数据，或搜索中（含无匹配结果）：保留搜索 + 工具栏 -->
    <template v-else-if="programList != null">
      <!-- 搜索：对齐移动端 pro.vue inputBack / getGroupProListHttp -->
      <div class="program-search">
        <i
          class="iconfont icon-farm_ic_search program-search__icon"
          @click="handleSearchClick"
        ></i>
        <input
          v-model="searchText"
          class="program-search__input"
          type="text"
          placeholder="输入轮灌程序名称"
          @input="handleSearchInput"
          @keyup.enter="handleSearchClick"
        />
        <i
          v-if="searchText"
          class="iconfont icon-shanchu program-search__clear"
          @click="clearSearch"
        ></i>
      </div>

      <div class="program-toolbar">
        <h2 class="program-toolbar__title">轮灌程序列表</h2>
        <div class="program-toolbar__actions">
          <button type="button" class="program-toolbar__record" @click="onRecord">
            <img
              class="program-toolbar__record-icon"
              :src="programRecordIcon"
              alt=""
            />
            运行记录
          </button>
          <el-button
            type="primary"
            class="program-toolbar__add"
            @click="onAddProgram"
          >
            <span class="program-toolbar__add-icon">+</span>
            添加轮灌程序
          </el-button>
        </div>
      </div>

      <div class="program-scroll">
        <div v-if="!programList.length" class="program-search-empty">
          未找到匹配的轮灌程序
        </div>
        <div v-else class="program-grid">
          <article
            v-for="item in programList"
            :key="item.id"
            class="program-card"
            @click="onProgramClick(item)"
          >
            <!-- 头部：名称 + 开关（锁定期间隐藏，对齐移动端 !isItemLocked） -->
            <div class="program-card__header">
              <div class="program-card__title-wrap">
                <h3 class="program-card__name">
                  {{ item.name || '未命名程序' }}
                </h3>
              </div>
              <!-- 定时：绑定 enabled -->
              <el-switch
                v-if="item.startCondition === 1 && !isItemLocked(item)"
                :model-value="item.enabled"
                @change="(val) => onTimerSwitchChange(item, val)"
                @click.stop
              />
              <!-- 手动：绑定 isRunning -->
              <el-switch
                v-else-if="item.startCondition === 0 && !isItemLocked(item)"
                :model-value="item.isRunning"
                @change="(val) => onManualSwitchChange(item, val)"
                @click.stop
              />
            </div>

            <!-- 标签：对齐移动端仅「手动 / 定时」 -->
            <div class="program-card__tags">
              <span class="program-card__tag is-primary">
                {{ getStartTypeText(item) }}
              </span>
            </div>

            <!-- 主内容区：双列指标 + 合计时长/地块（分割线上方） -->
            <div class="program-card__body">
              <div class="program-card__metric program-card__metric--left">
                <div class="program-card__metric-label">
                  {{ item.runningTasks ? '运行时长' : '下次启动时间' }}
                </div>
                <div
                  class="program-card__metric-value"
                  :class="getPrimaryMetricClass(item)"
                >
                  <template v-if="item.runningTasks">
                    {{ getRunTimeText(item) }}
                    <span
                      v-if="item.runningTasks.timerStatus == 1"
                      class="program-card__forbid"
                    >
                      (禁止时段内)
                    </span>
                  </template>
                  <template v-else>
                    {{ getNextRunDisplay(item) }}
                  </template>
                </div>
              </div>
              <div class="program-card__metric program-card__metric--right">
                <div class="program-card__metric-label">
                  {{ item.runningTasks ? '第几次轮灌' : '轮灌次数' }}
                </div>
                <div
                  class="program-card__metric-value"
                  :class="getSecondaryMetricClass(item)"
                >
                  <template v-if="item.runningTasks">
                    {{ item.runningTasks.currentCycle ?? 1 }}
                  </template>
                  <template v-else>
                    {{ item.rotationCount ?? 0 }}
                  </template>
                </div>
              </div>
              <span class="program-card__meta-item program-card__meta-item--left">
                合计时长:{{ getTotalDuration(item) }}
              </span>
              <span class="program-card__meta-item program-card__meta-item--right">
                地块:{{ getLandNameText(item) }}
              </span>
            </div>

            <!-- 底部：分割线下方仅展示轮灌组链路（固定两排高度） -->
            <div class="program-card__footer">
              <el-tooltip
                v-if="getSortedGroups(item.groups).length"
                :content="getGroupsChainText(item)"
                placement="top"
                :disabled="!isGroupsOverflow(item.id)"
                :show-after="200"
                popper-class="program-groups-tooltip"
              >
                <div class="program-card__groups">
                  <img
                    class="program-card__groups-icon"
                    :src="programGroupIcon"
                    alt=""
                  />
                  <div
                    class="program-card__groups-chain"
                    :ref="(el) => setGroupsElRef(item.id, el)"
                    @mouseenter="checkGroupsOverflow(item.id)"
                  >
                    <template
                      v-for="(g, idx) in getSortedGroups(item.groups)"
                      :key="`${g.stepType ?? 0}-${g.id ?? g.irrigationGroupId ?? g.outletId ?? idx}`"
                    >
                      <span
                        class="program-card__group-name"
                        :class="getGroupNameClass(item, g)"
                        @click.stop="onGroupNameClick(item, g)"
                      >
                        {{ g.name }}
                      </span>
                      <span
                        v-if="idx < getSortedGroups(item.groups).length - 1"
                        class="program-card__groups-sep"
                      >-></span>
                    </template>
                  </div>
                </div>
              </el-tooltip>
            </div>
          </article>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="program-loading">加载中...</div>

    <!-- 定时运行中停止：对齐移动端 a-tip-chose，默认不选，须选一项才能确定 -->
    <el-dialog
      v-model="timerStopVisible"
      title="提示"
      width="440px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onTimerStopClosed"
    >
      <p class="program-manual-stop-desc">
        当前预约定时有任务正在执行，请选择您的以下操作。
      </p>
      <el-radio-group v-model="timerStopChoice" class="program-timer-stop-radios">
        <el-radio :value="0">仅终止本次任务</el-radio>
        <el-radio :value="1">终止本次任务并取消后续重复任务</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="timerStopVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="timerStopChoice !== 0 && timerStopChoice !== 1"
          @click="confirmTimerStop"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 手动停止确认（对齐移动端 a-tip-sure） -->
    <el-dialog
      v-model="manualStopVisible"
      title="提示"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onManualStopClosed"
    >
      <p class="program-manual-stop-desc">
        手动停止将关闭已经打开的所有设备,是否继续？
      </p>
      <el-checkbox v-model="manualStopRiskChecked">
        已知晓风险，确认停止。
      </el-checkbox>
      <template #footer>
        <el-button @click="onCancelManualStop">取消</el-button>
        <el-button
          type="primary"
          :disabled="!manualStopRiskChecked"
          @click="confirmManualStop"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 启用定时失败提示：图2样式；「否」=取消，「是」=去设置 -->
    <el-dialog
      v-model="enableFailVisible"
      width="520px"
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
      align-center
      class="program-enable-fail-dialog"
      @closed="onEnableFailClosed"
    >
      <div class="program-enable-fail">
        <h3 class="program-enable-fail__title">提示</h3>
        <p class="program-enable-fail__msg">{{ enableFailMessage }}</p>
        <div class="program-enable-fail__actions">
          <button
            type="button"
            class="program-enable-fail__btn is-no"
            @click="onEnableFailCancel"
          >
            否
          </button>
          <button
            type="button"
            class="program-enable-fail__btn is-yes"
            @click="onEnableFailConfirm"
          >
            是
          </button>
        </div>
      </div>
    </el-dialog>

    <LandEmptyDialog
      v-model="landEmptyVisible"
      @create="onCreateLandFromEmpty"
    />

    <ProgramRecordDialog v-model="recordVisible" />
  </div>
</template>

<script setup>
/**
 * 对齐移动端 pages/home/fragment/pro/pro.vue 列表页
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import {
  closeGroupPro,
  enableGroupPro,
  getGroupProList,
  openGroupPro
} from '@/api/irrigationProgram'
import LandEmptyDialog from '@/views/Map/LandEmptyDialog.vue'
import ProgramRecordDialog from './ProgramRecordDialog.vue'
import programGroupIcon from '@/assets/irrigation-program/program-group-icon.svg'
import programRecordIcon from '@/assets/irrigation-program/program-record-icon.svg'

const router = useRouter()
const farmStore = useFarmStore()

const programList = ref(null)
const loading = ref(false)
const searchText = ref('')
/** 实际请求参数，对齐移动端 searchTextCache */
const searchTextCache = ref('')
const runTick = ref(0)
const controlProgram = ref(null)
const landEmptyVisible = ref(false)
const manualStopVisible = ref(false)
const manualStopRiskChecked = ref(false)
const pendingStopItem = ref(null)
const timerStopVisible = ref(false)
/** null 表示未选择，对齐移动端 a-tip-chose 默认不选 */
const timerStopChoice = ref(null)
const pendingTimerStopItem = ref(null)
const recordVisible = ref(false)
/** 启用定时失败弹窗（图2：否=取消，是=去设置） */
const enableFailVisible = ref(false)
const enableFailMessage = ref('当前时间已经超过设置的开始时间，请调整开始时间')
const pendingEnableFailItem = ref(null)

const POLL_MS = 5000
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

/** 对齐移动端 ProEmpty：仅无搜索关键字且列表为空 */
const showEmpty = computed(() => {
  if (programList.value == null) return false
  return programList.value.length <= 0 && !String(searchText.value || '').trim()
})

/* ========== 展示工具 ========== */

/** 卡片展示下次启动时间：MM-dd HH:mm:ss，空值兜底 -- */
const formatNextRunShort = (utcStr) => {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

const isProgramRunning = (item) => !!item?.runningTasks

const isProgramOn = (item) => {
  if (item?.startCondition === 1) {
    return !!item.enabled || isProgramRunning(item)
  }
  return !!item?.isRunning || isProgramRunning(item)
}

const isScheduledProgram = (item) => item?.startCondition === 1

const getNextRunDisplay = (item) =>
  formatNextRunShort(item?.timerTaskConfig?.nextRunTime)

const getLandNameText = (item) =>
  item?.landName || item?.land?.name || '--'

/** 主指标着色：运行中绿/蓝，开启未运行深蓝，关闭灰色 */
const getPrimaryMetricClass = (item) => {
  if (isProgramRunning(item)) {
    return isScheduledProgram(item)
      ? 'is-scheduled-running'
      : 'is-manual-running'
  }
  if (isProgramOn(item)) return 'is-on-idle'
  return 'is-off'
}

/** 次指标着色：仅运行中跟随主色 */
const getSecondaryMetricClass = (item) => {
  if (!isProgramRunning(item)) return ''
  return isScheduledProgram(item)
    ? 'is-scheduled-running'
    : 'is-manual-running'
}

const getGroupNameClass = (item, group) => {
  if (!isCurrentRunningGroup(item, group)) return {}
  return {
    'is-current': true,
    'is-scheduled': isScheduledProgram(item),
    'is-manual': !isScheduledProgram(item),
    'is-clickable': true
  }
}

/** 对齐移动端：时:分:秒，不单独算天 */
const calcRunTime = (startUtc) => {
  void runTick.value
  if (!startUtc) return '--'
  const start = new Date(startUtc).getTime()
  if (Number.isNaN(start)) return '--'
  const diffMs = Date.now() - start
  if (diffMs <= 0) return '00:00:00'
  const diffS = Math.floor(diffMs / 1000)
  const h = Math.floor(diffS / 3600)
  const m = Math.floor((diffS % 3600) / 60)
  const s = diffS % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

const getRunTimeText = (item) => {
  if (!item.runningTasks?.startTime) return '--'
  return calcRunTime(item.runningTasks.startTime)
}

const second2Time = (value) => {
  let sec = parseInt(value, 10) || 0
  let h = 0
  let m = 0
  if (sec >= 60) {
    m = Math.floor(sec / 60)
    sec %= 60
    if (m >= 60) {
      h = Math.floor(m / 60)
      m %= 60
    }
  }
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`
}

/** 合计时长 = (组时长之和 + 间隔) * 次数 - 间隔 */
const getTotalDuration = (item) => {
  let total = 0
  if (item.groups?.length) {
    total = item.groups.reduce(
      (sum, cur) => sum + Number(cur.durationSeconds || 0),
      0
    )
  }
  const interval = Number(item.intervalSeconds || 0)
  const count = Number(item.rotationCount || 1)
  const reTotal = (total + interval) * count - interval
  return second2Time(Math.max(reTotal, 0))
}

const getSortedGroups = (groups) => {
  if (!Array.isArray(groups)) return []
  return [...groups].sort((a, b) => a.groupIndex - b.groupIndex)
}

/** 轮灌组链路全文，供 hover tooltip 展示 */
const getGroupsChainText = (item) =>
  getSortedGroups(item?.groups)
    .map((g) => g.name || '')
    .filter(Boolean)
    .join('->')

const groupsElMap = new Map()
const groupsOverflowMap = ref({})

const setGroupsElRef = (id, el) => {
  const key = String(id)
  if (el) groupsElMap.set(key, el)
  else groupsElMap.delete(key)
}

/** 内容超出卡片宽度时才启用 tooltip */
const checkGroupsOverflow = (id) => {
  const key = String(id)
  const el = groupsElMap.get(key)
  if (!el) return
  const overflow =
    el.scrollHeight > el.clientHeight + 1 ||
    el.scrollWidth > el.clientWidth + 1
  if (groupsOverflowMap.value[key] === overflow) return
  groupsOverflowMap.value = {
    ...groupsOverflowMap.value,
    [key]: overflow
  }
}

const isGroupsOverflow = (id) => !!groupsOverflowMap.value[String(id)]

const isCurrentRunningGroup = (item, group) =>
  !!(
    item?.runningTasks &&
    group &&
    group.groupIndex === item.runningTasks.currentGroupIndex
  )

/** 对齐移动端：手动 / 定时 */
const getStartTypeText = (item) => {
  if (item.startCondition === 0) return '手动'
  if (item.startCondition === 1) return '定时'
  return '自定义'
}

const isItemLocked = (item) => {
  // 依赖 runTick，锁定到期后尽快恢复开关展示
  void runTick.value
  return !!(item.lockUntil && item.lockUntil > Date.now())
}

/* ========== 数据合并（对齐移动端 lockUntil / isRunning） ========== */

const mergeItemState = (newItem, oldItem) => {
  const now = Date.now()
  const isLocked = oldItem && oldItem.lockUntil && oldItem.lockUntil > now
  const baseItem = { ...newItem }

  if (isLocked) {
    return {
      ...baseItem,
      isRunning: oldItem.isRunning,
      lockUntil: oldItem.lockUntil
    }
  }

  return {
    ...baseItem,
    isRunning: newItem.runningTasks != null,
    lockUntil: 0
  }
}

/* ========== 请求 ========== */

const fetchList = async ({ silent = false, isSearch: searchAction = false } = {}) => {
  const farmId = getFarmId()
  if (farmId == null) {
    programList.value = []
    return
  }

  if (searchAction) {
    searchTextCache.value = searchText.value
  }

  const requestId = ++listRequestId
  if (!silent && programList.value == null) loading.value = true

  try {
    const res = await getGroupProList(
      { farmId, searchText: searchTextCache.value },
      { silent }
    )
    if (requestId !== listRequestId) return
    const newData = Array.isArray(res?.data) ? res.data : []
    const oldList = programList.value || []
    programList.value = newData.map((newItem) => {
      const oldItem = oldList.find((g) => String(g.id) === String(newItem.id))
      return mergeItemState(newItem, oldItem)
    })
    ensureRunTick()
  } catch (e) {
    if (requestId !== listRequestId) return
    console.error('[IrrigationProgram] 获取列表失败', e)
    if (programList.value == null) programList.value = []
  } finally {
    if (requestId === listRequestId) loading.value = false
  }
}

/* ========== 开关逻辑（对齐移动端 onChange / onChange2） ========== */

const findItem = (id) =>
  programList.value?.find((item) => String(item.id) === String(id))

const lockItem = (id) => {
  const target = findItem(id)
  if (target) target.lockUntil = Date.now() + LOCK_SECONDS * 1000
}

const unlockItem = (id) => {
  const target = findItem(id)
  if (target) target.lockUntil = 0
}

/** 定时开关 */
const onTimerSwitchChange = async (item, enabled) => {
  controlProgram.value = item
  const isRun = item.runningTasks != null

  if (isRun) {
    if (!enabled) {
      // 回滚开关，打开选择弹窗（对齐移动端 choseTip）
      item.enabled = true
      openTimerStopDialog(item)
    }
    return
  }

  item.enabled = enabled
  await enableGroupProHttp(item.id, enabled)
}

/** 手动开关 */
const onManualSwitchChange = async (item, nextRunning) => {
  controlProgram.value = item
  const isRun = item.runningTasks != null

  if (isRun) {
    if (!nextRunning) {
      // 对齐移动端 onChange2：点关后立即锁定隐藏开关，再弹确认
      item.isRunning = true
      item.lockUntil = Date.now() + LOCK_SECONDS * 1000
      ensureRunTick()
      openManualStopDialog(item)
    }
    return
  }

  if (nextRunning) {
    item.isRunning = true
    item.lockUntil = Date.now() + LOCK_SECONDS * 1000
    ensureRunTick()
    await openGroupProHttp(item.id)
  } else {
    item.isRunning = false
    item.lockUntil = 0
    ElMessage.warning('操作无效')
  }
}

const openTimerStopDialog = (item) => {
  pendingTimerStopItem.value = item
  timerStopChoice.value = null
  timerStopVisible.value = true
}

const onTimerStopClosed = () => {
  pendingTimerStopItem.value = null
  timerStopChoice.value = null
}

const confirmTimerStop = async () => {
  const item = pendingTimerStopItem.value
  if (!item || (timerStopChoice.value !== 0 && timerStopChoice.value !== 1)) {
    ElMessage.warning('请选择操作方式')
    return
  }
  const cancelRepeat = timerStopChoice.value === 1
  timerStopVisible.value = false
  item.lockUntil = Date.now() + LOCK_SECONDS * 1000
  ensureRunTick()
  await closeGroupProHttp({
    id: item.id,
    cancelRepeat
  })
}

const openManualStopDialog = (item) => {
  pendingStopItem.value = item
  manualStopRiskChecked.value = false
  manualStopVisible.value = true
}

const onManualStopClosed = () => {
  pendingStopItem.value = null
  manualStopRiskChecked.value = false
}

/** 取消手动停止：解除锁定，开关保持运行态（打开弹窗前已回滚 isRunning） */
const onCancelManualStop = () => {
  const item = pendingStopItem.value
  if (item) {
    item.lockUntil = 0
    item.isRunning = true
  }
  manualStopVisible.value = false
}

const confirmManualStop = async () => {
  const item = pendingStopItem.value
  if (!item || !manualStopRiskChecked.value) return
  manualStopVisible.value = false
  // 锁定已在打开弹窗时设置；成功后再续锁
  item.lockUntil = Date.now() + LOCK_SECONDS * 1000
  ensureRunTick()
  await closeGroupProHttp({
    id: item.id,
    cancelRepeat: false
  })
}

/**
 * 对齐移动端 enableGroupProHttp：
 * 失败回滚开关；弹图2样式提示；「是」=去设置，「否」=取消
 */
const enableGroupProHttp = async (id, enabled) => {
  try {
    await enableGroupPro({ id, enabled }, { silent: true })
    ElMessage.success('操作成功')
  } catch (e) {
    const target = findItem(id)
    if (target) target.enabled = !enabled
    enableFailMessage.value =
      e?.message ||
      e?.msg ||
      e?.err ||
      '当前时间已经超过设置的开始时间，请调整开始时间'
    pendingEnableFailItem.value = controlProgram.value || target
    enableFailVisible.value = true
    console.error('[IrrigationProgram] 启用/禁用失败', e)
  }
}

/** 「否」= 原取消：仅关闭弹窗（开关已回滚） */
const onEnableFailCancel = () => {
  enableFailVisible.value = false
}

/** 「是」= 原去设置：进入编辑页调整开始时间 */
const onEnableFailConfirm = () => {
  const item = pendingEnableFailItem.value
  enableFailVisible.value = false
  onProSet(item)
}

const onEnableFailClosed = () => {
  pendingEnableFailItem.value = null
}

const openGroupProHttp = async (id) => {
  try {
    const res = await openGroupPro({ id })
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      lockItem(id)
      await fetchList({ silent: true })
    } else {
      unlockItem(id)
      const target = findItem(id)
      if (target) target.isRunning = false
    }
  } catch (e) {
    unlockItem(id)
    const target = findItem(id)
    if (target) target.isRunning = false
    console.error('[IrrigationProgram] 手动启动失败', e)
  }
}

const closeGroupProHttp = async (order) => {
  const id = order.id
  try {
    const res = await closeGroupPro(order)
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      lockItem(id)
      await fetchList({ silent: true })
    } else {
      unlockItem(id)
    }
  } catch (e) {
    unlockItem(id)
    console.error('[IrrigationProgram] 停止失败', e)
  }
}

/* ========== 计时 / 轮询 ========== */

const ensureRunTick = () => {
  const list = programList.value || []
  const hasRunning = list.some((item) => !!item.runningTasks)
  const hasLocked = list.some((item) => item.lockUntil && item.lockUntil > Date.now())
  if ((hasRunning || hasLocked) && !runTickTimer) {
    runTickTimer = setInterval(() => {
      runTick.value += 1
      const still =
        (programList.value || []).some((item) => !!item.runningTasks) ||
        (programList.value || []).some(
          (item) => item.lockUntil && item.lockUntil > Date.now()
        )
      if (!still) clearRunTick()
    }, 1000)
  } else if (!hasRunning && !hasLocked) {
    clearRunTick()
  }
}

const clearRunTick = () => {
  if (runTickTimer) {
    clearInterval(runTickTimer)
    runTickTimer = null
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
  fetchList({ silent: false })
  pollTimer = setInterval(() => {
    fetchList({ silent: true })
  }, POLL_MS)
}

/** 对齐移动端 inputBack：输入清空时重新拉列表 */
const handleSearchInput = () => {
  if (searchText.value === '') {
    fetchList({ silent: false, isSearch: true })
  }
}

/** 点击清空图标：与手动清空输入框行为一致 */
const clearSearch = () => {
  searchText.value = ''
  handleSearchInput()
}

/** 对齐移动端 getGroupProListHttp(true,true)：点击搜索 / 回车 */
const handleSearchClick = () => {
  fetchList({ silent: false, isSearch: true })
}

/* ========== 业务出口（后续补齐） ========== */

/** 添加前地块校验，对齐移动端 pro_empty.noLandPop */
const onAddProgram = async () => {
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
    router.push({ path: '/irrigation-program/edit', query: { type: 'add' } })
  } catch (e) {
    console.error('[IrrigationProgram] 添加轮灌程序前置校验失败', e)
    ElMessage.error('获取农场信息失败')
  }
}

const onCreateLandFromEmpty = () => {
  landEmptyVisible.value = false
  router.push({ path: '/map/edit-plot', query: { type: 'add' } })
}

const onRecord = () => {
  if (getFarmId() == null) {
    ElMessage.warning('请先选择农场')
    return
  }
  recordVisible.value = true
}

const onProgramClick = (item) => {
  if (!item?.id) return
  farmStore.setProInfo(item)
  router.push({ path: '/irrigation-program/edit', query: { type: 'edit' } })
}

/** 40001 去设置 → 编辑页 event=setTime */
const onProSet = (item) => {
  const target = item || controlProgram.value
  if (!target?.id) return
  farmStore.setProInfo(target)
  router.push({
    path: '/irrigation-program/edit',
    query: { type: 'edit', event: 'setTime' }
  })
}

/** 运行中当前步骤 → 组详情 / 设备控制，对齐移动端 toGourpDetail */
const onGroupNameClick = (item, group) => {
  if (!isCurrentRunningGroup(item, group)) return
  const stepType = Number(group?.stepType ?? 0)

  if (stepType === 1) {
    const deviceId = group.deviceId
    if (deviceId == null) {
      ElMessage.warning('缺少设备信息')
      return
    }
    const bean = {
      ...group,
      id: deviceId,
      name: group.name || getGroupDisplayNameFromProgram(item, group)
    }
    farmStore.setControlDevice(bean)
    router.push({
      path: '/device/control',
      query: { id: String(deviceId) }
    })
    return
  }

  const groupId = group.irrigationGroupId ?? group.id
  if (groupId == null) return
  const bean = {
    ...group,
    id: groupId,
    name: group.name || getGroupDisplayNameFromProgram(item, group)
  }
  farmStore.setGroupListItem(bean)
  router.push({
    path: '/irrigation-group/detail',
    query: { id: String(groupId), from: 'pro' }
  })
}

function getGroupDisplayNameFromProgram(item, group) {
  if (group?.name) return group.name
  const sorted = getSortedGroups(item?.groups)
  const current = sorted.find((g) => g.groupIndex === group?.groupIndex)
  return current?.name || '轮灌组'
}

/* ========== 生命周期 ========== */

const handleFarmChange = () => {
  programList.value = null
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
.program-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #f7fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.program-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.program-manual-stop-desc {
  margin: 0 0 16px;
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
}

.program-timer-stop-radios {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.program-search-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #909399;
  font-size: 14px;
}

/* ========== 空态 ========== */

.program-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f7fafc;
  padding: 24px;
}

.program-empty__img {
  width: 160px;
  height: 160px;
  object-fit: contain;
}

.program-empty__text {
  margin: 20px 0 0;
  font-size: 15px;
  color: #909399;
  line-height: 1.5;
}

.program-empty__btn {
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

.program-empty__btn:hover {
  background: #2f4a90;
}

.program-search {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 500px;
  max-width: 100%;
  height: 44px;
  margin: 16px 20px 0;
  padding: 0 14px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(31, 45, 61, 0.08);
  box-sizing: border-box;
  /* 暂时隐藏搜索模块，恢复时删除以下样式 */
  visibility: hidden;
  height: 0;
  width: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
  box-shadow: none;
}

.program-search__icon {
  font-size: 18px;
  color: #8c8c8c;
  flex-shrink: 0;
  cursor: pointer;
}

.program-search__icon:hover {
  color: #595959;
}

.program-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1a1a1a;
}

.program-search__input::placeholder {
  color: #b0b0b0;
}

.program-search__clear {
  font-size: 14px;
  color: #b0b0b0;
  flex-shrink: 0;
  cursor: pointer;
}

.program-search__clear:hover {
  color: #8c8c8c;
}

/* ========== 工具栏 ========== */

.program-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px 0;
  background: #f7fafc;
}

.program-toolbar__title {
  margin: 0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 22px;
  font-weight: bold;
  color: #0f172a;
  line-height: 1.4;
}

.program-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.program-toolbar__record {
  height: 44px;
  padding: 0 20px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #fff;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.program-toolbar__record:hover {
  border-color: #3653a0;
  color: #3653a0;
}

.program-toolbar__record-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  display: block;
}

.program-toolbar__add {
  height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  background: #3653a0;
  border-color: #3653a0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: bold;
}

.program-toolbar__add:hover,
.program-toolbar__add:focus {
  background: #2f4a90;
  border-color: #2f4a90;
}

.program-toolbar__add-icon {
  margin-right: 4px;
  font-size: 14px;
  font-weight: bold;
}

/* ========== 卡片网格 ========== */

.program-scroll {
  flex: 1;
  overflow: auto;
  margin-top: 30px;
  padding: 0 20px 24px;
}

.program-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 280px;
  gap: 20px;
}

.program-card {
  height: 280px;
  min-height: 280px;
  max-height: 280px;
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

.program-card:hover {
  box-shadow: 0 6px 20px rgba(31, 45, 61, 0.1);
}

/* ---- 头部 ---- */

.program-card__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.program-card__header :deep(.el-switch) {
  --el-switch-on-color: #3653a0;
  --el-switch-off-color: #dcdfe6;
}

.program-card__header :deep(.el-switch.is-checked .el-switch__core) {
  border-color: #3653a0;
  background-color: #3653a0;
}

.program-card__title-wrap {
  min-width: 0;
  flex: 1;
}

.program-card__name {
  margin: 0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-weight: bold;
  line-height: 1.4;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 标签 ---- */

.program-card__tags {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.program-card__tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 25px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.program-card__tag.is-primary {
  background: rgba(26, 59, 135, 0.1);
  color: #1a3b87;
}

/* ---- 中间内容区 ---- */

.program-card__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 30px;
  grid-template-rows: auto auto;
  column-gap: 16px;
  row-gap: 8px;
  margin-top: 5px;
  margin-bottom: 5px;
  align-content: start;
  overflow: hidden;
}

.program-card__metric {
  min-width: 0;
}

.program-card__metric--left,
.program-card__meta-item--left {
  grid-column: 1;
}

.program-card__metric--right,
.program-card__meta-item--right {
  grid-column: 2;
  justify-self: start;
  text-align: left;
}

.program-card__metric--left {
  grid-row: 1;
  min-width: 0;
}

.program-card__metric--left .program-card__metric-value {
  white-space: nowrap;
  word-break: keep-all;
}

.program-card__metric--right {
  grid-row: 1;
}

.program-card__meta-item--left {
  grid-row: 2;
}

.program-card__meta-item--right {
  grid-row: 2;
}

.program-card__metric-label {
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.program-card__metric-value {
  margin-top: 4px;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 26px;
  font-weight: bold;
  line-height: 1.3;
  color: #0f172a;
}

.program-card__metric-value.is-scheduled-running {
  color: #16a34a;
}

.program-card__metric-value.is-manual-running {
  color: #2563eb;
}

.program-card__metric-value.is-on-idle {
  color: #3653a0;
}

.program-card__metric-value.is-off {
  color: #c0c4cc;
}

.program-card__forbid {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  vertical-align: middle;
}

.program-card__meta-item {
  min-width: 0;
  font-size: 16px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 底部（固定高度：分割线 + 两排链路） ---- */

.program-card__footer {
  flex-shrink: 0;
  height: 55px;
  padding-top: 12px;
  border-top: 1px solid #edf1f7;
  box-sizing: border-box;
}

.program-card__groups {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  height: 42px;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
  max-width: 100%;
  cursor: default;
}

.program-card__groups-icon {
  flex-shrink: 0;
  width: 12px;
  height: 15px;
  margin-top: 1px;
}

.program-card__groups-chain {
  flex: 1;
  min-width: 0;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  word-break: break-all;
}

.program-card__group-name.is-current.is-scheduled {
  color: #16a34a;
  font-weight: 600;
}

.program-card__group-name.is-current.is-manual {
  color: #2563eb;
  font-weight: 600;
}

.program-card__group-name.is-clickable {
  cursor: pointer;
}

.program-card__group-name.is-clickable:hover {
  text-decoration: underline;
}

.program-card__groups-sep {
  margin: 0 2px;
  color: #c0c4cc;
}

/* ========== 响应式 ========== */

@media (max-width: 1400px) {
  .program-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .program-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<style>
/* 轮灌组链路过长时 hover 全文提示 */
.program-groups-tooltip {
  max-width: 360px;
  line-height: 1.5;
  word-break: break-all;
}

/* 启用定时失败提示弹窗（图2：520×260，圆角20） */
.program-enable-fail-dialog.el-dialog {
  width: 520px !important;
  height: 260px;
  border-radius: 20px;
  opacity: 1;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.16);
}

.program-enable-fail-dialog .el-dialog__header {
  display: none;
  padding: 0;
  margin: 0;
}

.program-enable-fail-dialog .el-dialog__body {
  padding: 0;
  height: 260px;
  box-sizing: border-box;
}

.program-enable-fail {
  width: 100%;
  height: 260px;
  box-sizing: border-box;
  padding: 36px 40px 28px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.program-enable-fail__title {
  margin: 0;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  color: #1a1a1a;
  flex-shrink: 0;
}

.program-enable-fail__msg {
  flex: 1;
  margin: 0;
  padding: 24px 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: #303133;
  word-break: break-word;
}

.program-enable-fail__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.program-enable-fail__btn {
  min-width: 88px;
  height: 40px;
  padding: 0 28px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  box-sizing: border-box;
}

.program-enable-fail__btn.is-no {
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #303133;
}

.program-enable-fail__btn.is-no:hover {
  border-color: #c0c4cc;
  color: #1a1a1a;
}

.program-enable-fail__btn.is-yes {
  border: none;
  background: #3653a0;
  color: #ffffff;
}

.program-enable-fail__btn.is-yes:hover {
  background: #2f4a90;
}
</style>
