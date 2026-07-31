<template>
  <div class="program-page">
    <!-- 空态 -->
    <div v-if="showEmpty" class="program-empty">
      <img
        class="program-empty__img"
        src="@/assets/irrigation-group/group-empty.png"
        alt=""
      />
      <p class="program-empty__text">嗨！您还没有轮灌程序</p>
      <button type="button" class="program-empty__btn" @click="onAddProgram">
        添加轮灌程序
      </button>
    </div>

    <!-- 有数据 -->
    <template v-else-if="programList != null">
      <div class="program-toolbar">
        <h2 class="program-toolbar__title">轮灌程序列表</h2>
        <div class="program-toolbar__actions">
          <button type="button" class="program-toolbar__record" @click="onRecord">
            <i class="iconfont icon-device_ic_record"></i>
            开关记录
          </button>
          <el-button
            type="primary"
            class="program-toolbar__add"
            @click="onAddProgram"
          >
            <span class="program-toolbar__add-icon">+</span>
            新建轮灌程序
          </el-button>
        </div>
      </div>

      <div class="program-scroll">
        <div class="program-grid">
          <article
            v-for="item in programList"
            :key="item.id"
            class="program-card"
            :class="{ 'is-disabled': isCardDisabled(item) }"
            @click="onProgramClick(item)"
          >
            <!-- 头部：名称 + 开关 -->
            <div class="program-card__header">
              <div class="program-card__title-wrap">
                <h3 class="program-card__name">
                  {{ item.name || '未命名程序' }}
                </h3>
              </div>
              <!-- 定时：绑定 enabled -->
              <el-switch
                v-if="item.startCondition === 1"
                :model-value="item.enabled"
                :disabled="isItemLocked(item)"
                @change="(val) => onTimerSwitchChange(item, val)"
                @click.stop
              />
              <!-- 手动：绑定 isRunning -->
              <el-switch
                v-else-if="item.startCondition === 0"
                :model-value="item.isRunning"
                :disabled="isItemLocked(item)"
                @change="(val) => onManualSwitchChange(item, val)"
                @click.stop
              />
            </div>

            <!-- 标签行 -->
            <div class="program-card__tags">
              <span class="program-card__tag is-primary">
                {{ getStartTypeText(item) }}
              </span>
              <span class="program-card__tag is-secondary">
                {{ getRepeatTypeText(item) }}
              </span>
            </div>

            <!-- 中间主信息 -->
            <div class="program-card__body">
              <!-- 运行中 -->
              <template v-if="item.runningTasks">
                <div class="program-card__status-label is-running">
                  {{ item.startCondition === 0 ? '运行时长' : '正在运行' }}
                  <span
                    v-if="item.runningTasks.timerStatus == 1"
                    class="program-card__forbid"
                  >
                    (禁止时段内)
                  </span>
                </div>
                <div
                  class="program-card__big-value"
                  :class="item.startCondition === 0 ? 'is-manual' : 'is-running'"
                >
                  {{ getRunTimeText(item) }}
                </div>
              </template>

              <!-- 下次启动时间 -->
              <template
                v-else-if="
                  item.timerTaskConfig?.nextRunTime &&
                  item.startCondition !== 0
                "
              >
                <div class="program-card__status-label">下次启动时间</div>
                <div class="program-card__big-value is-next">
                  {{ formatNextRun(item.timerTaskConfig.nextRunTime) }}
                </div>
              </template>

              <!-- 无排期 -->
              <template v-else>
                <div class="program-card__status-label">暂无排期</div>
                <div class="program-card__big-value is-muted">--</div>
              </template>
            </div>

            <!-- 底部信息 -->
            <div class="program-card__footer">
              <!-- 运行中：当前灌溉组 -->
              <template v-if="item.runningTasks">
                <div class="program-card__footer-row">
                  <i class="iconfont icon-map_ic_opening program-card__footer-icon"></i>
                  <span class="program-card__footer-text">
                    轮灌组：{{ getCurrentGroupName(item) }}正在灌溉
                  </span>
                </div>
                <div class="program-card__footer-meta">
                  第{{ item.runningTasks.currentCycle ?? 1 }}次轮灌
                </div>
              </template>

              <!-- 非运行：时长 + 重复次数 -->
              <template v-else>
                <div class="program-card__footer-row">
                  <span class="program-card__footer-item">
                    <i class="iconfont icon-device_ic_hourglass program-card__footer-icon"></i>
                    轮灌时长 {{ getTotalDuration(item) }}
                  </span>
                  <span class="program-card__footer-item">
                    <i class="iconfont icon-device_ic_run_01 program-card__footer-icon"></i>
                    重复次数 {{ item.rotationCount ?? 0 }}次
                  </span>
                </div>
                <div
                  v-if="getSortedGroups(item.groups).length"
                  class="program-card__groups"
                >
                  <template
                    v-for="(g, idx) in getSortedGroups(item.groups)"
                    :key="g.id || idx"
                  >
                    <span>{{ g.name }}</span>
                    <span
                      v-if="idx < getSortedGroups(item.groups).length - 1"
                      class="program-card__groups-sep"
                    >→</span>
                  </template>
                </div>
              </template>
            </div>
          </article>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="program-loading">加载中...</div>
  </div>
</template>

<script setup>
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox, ElRadio, ElRadioGroup } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import {
  closeGroupPro,
  enableGroupPro,
  getGroupProList,
  openGroupPro
} from '@/api/irrigationProgram'

const farmStore = useFarmStore()

const programList = ref(null)
const loading = ref(false)
const runTick = ref(0)
const controlProgram = ref(null)

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

const showEmpty = computed(() => {
  if (programList.value == null) return false
  return programList.value.length <= 0
})

/* ========== 展示工具 ========== */

const formatNextRun = (utcStr) => {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad2(d.getMonth() + 1)}月${pad2(d.getDate())}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
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

/** 合计轮灌时长 = (组时长之和 + 间隔) * 次数 - 间隔 */
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

const getCurrentGroupName = (item) => {
  const groups = getSortedGroups(item.groups)
  if (!groups.length) return '--'
  const idx = item.runningTasks?.currentGroupIndex
  const current = groups.find((g) => g.groupIndex === idx)
  return current?.name || groups[0]?.name || '--'
}

const getStartTypeText = (item) => {
  if (item.startCondition === 0) return '手动启动'
  if (item.startCondition === 1) return '定时启动'
  return '自定义启动'
}

const getRepeatTypeText = (item) => {
  const repeatType = item.timerTaskConfig?.timerConfig?.repeatType
  if (repeatType === 0) return '单次执行'
  if (repeatType != null && repeatType > 0) return '重复执行'
  return Number(item.rotationCount) > 1 ? '重复执行' : '单次执行'
}

const isCardDisabled = (item) =>
  item.startCondition === 1 && item.enabled === false && !item.runningTasks

const isItemLocked = (item) =>
  !!(item.lockUntil && item.lockUntil > Date.now())

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

const fetchList = async ({ silent = false } = {}) => {
  const farmId = getFarmId()
  if (farmId == null) {
    programList.value = []
    return
  }

  const requestId = ++listRequestId
  if (!silent && programList.value == null) loading.value = true

  try {
    const res = await getGroupProList(
      { farmId, searchText: '' },
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
      // 运行中关闭：弹窗选择终止方式
      item.enabled = true
      await openStopChoiceDialog(item)
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
      item.isRunning = true
      await openManualStopDialog(item)
    }
    return
  }

  if (nextRunning) {
    item.isRunning = true
    item.lockUntil = Date.now() + LOCK_SECONDS * 1000
    await openGroupProHttp(item.id)
  } else {
    item.isRunning = false
    item.lockUntil = 0
    ElMessage.warning('操作无效')
  }
}

const openStopChoiceDialog = async (item) => {
  const choice = ref(0)
  try {
    await ElMessageBox({
      title: '提示',
      message: () =>
        h('div', { class: 'program-stop-dialog' }, [
          h(
            'p',
            { style: 'margin: 0 0 16px; color: #303133; font-weight: 600;' },
            '当前预约定时有任务正在执行，请选择您的以下操作。'
          ),
          h(
            ElRadioGroup,
            {
              modelValue: choice.value,
              'onUpdate:modelValue': (v) => {
                choice.value = v
              },
              style: 'display:flex;flex-direction:column;gap:12px;'
            },
            {
              default: () => [
                h(ElRadio, { value: 0 }, () => '仅终止本次任务'),
                h(ElRadio, { value: 1 }, () => '终止本次任务并取消后续重复任务')
              ]
            }
          )
        ]),
      showCancelButton: true,
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      beforeClose: (action, _instance, done) => {
        if (action === 'confirm' && choice.value !== 0 && choice.value !== 1) {
          ElMessage.warning('请选择操作方式')
          return
        }
        done()
      }
    })
    item.lockUntil = Date.now() + LOCK_SECONDS * 1000
    await closeGroupProHttp({
      id: item.id,
      cancelRepeat: choice.value === 1
    })
  } catch {
    // 取消：恢复开关
  }
}

const openManualStopDialog = async (item) => {
  try {
    await ElMessageBox.confirm(
      '手动停止将关闭已经打开的所有设备,是否继续？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    item.lockUntil = Date.now() + LOCK_SECONDS * 1000
    await closeGroupProHttp({
      id: item.id,
      cancelRepeat: false
    })
  } catch {
    // 取消
  }
}

const enableGroupProHttp = async (id, enabled) => {
  try {
    const res = await enableGroupPro({ id, enabled })
    if (res?.code === 200) {
      ElMessage.success('操作成功')
    } else if (res?.code === 40001) {
      const target = findItem(id)
      if (target) target.enabled = !enabled
      ElMessage.warning('开始执行时间必须大于当前时间，请先去设置')
    } else {
      const target = findItem(id)
      if (target) target.enabled = !enabled
    }
  } catch (e) {
    const target = findItem(id)
    if (target) target.enabled = !enabled
    console.error('[IrrigationProgram] 启用/禁用失败', e)
  }
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
  const hasRunning = (programList.value || []).some((item) => !!item.runningTasks)
  if (hasRunning && !runTickTimer) {
    runTickTimer = setInterval(() => {
      runTick.value += 1
      if (!(programList.value || []).some((item) => !!item.runningTasks)) {
        clearRunTick()
      }
    }, 1000)
  } else if (!hasRunning) {
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

/* ========== 预留出口 ========== */

const onAddProgram = () => {
  console.log('[IrrigationProgram] onAddProgram 预留出口')
  ElMessage.info('新建轮灌程序功能开发中')
}

const onRecord = () => {
  console.log('[IrrigationProgram] onRecord 预留出口')
  ElMessage.info('开关记录功能开发中')
}

const onProgramClick = (item) => {
  console.log('[IrrigationProgram] onProgramClick 预留出口', item)
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

/* ========== 工具栏 ========== */

.program-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
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

.program-toolbar__record .iconfont {
  font-size: 16px;
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
  grid-auto-rows: 260px;
  gap: 20px;
}

.program-card {
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

.program-card:hover {
  box-shadow: 0 6px 20px rgba(31, 45, 61, 0.1);
}

.program-card.is-disabled .program-card__name,
.program-card.is-disabled .program-card__big-value,
.program-card.is-disabled .program-card__status-label,
.program-card.is-disabled .program-card__footer {
  color: #c0c4cc !important;
}

/* ---- 头部 ---- */

.program-card__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
}

.program-card__tag.is-primary {
  background: #edf1f7;
  color: #3653a0;
}

.program-card__tag.is-secondary {
  background: #f5f7fa;
  color: #909399;
}

/* ---- 中间 ---- */

.program-card__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 8px;
}

.program-card__status-label {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.program-card__status-label.is-running {
  color: #16a34a;
}

.program-card__forbid {
  margin-left: 4px;
  color: #303133;
  font-weight: 600;
}

.program-card__big-value {
  margin-top: 6px;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 28px;
  font-weight: bold;
  line-height: 1.3;
  color: #0f172a;
}

.program-card__big-value.is-running {
  color: #16a34a;
}

.program-card__big-value.is-manual {
  color: #3653a0;
}

.program-card__big-value.is-next {
  color: #0f172a;
}

.program-card__big-value.is-muted {
  color: #c0c4cc;
}

/* ---- 底部 ---- */

.program-card__footer {
  flex-shrink: 0;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #edf1f7;
}

.program-card__footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #606266;
}

.program-card__footer-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.program-card__footer-icon {
  font-size: 14px;
  color: #909399;
  flex-shrink: 0;
}

.program-card__footer-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.program-card__footer-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.program-card__groups {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.program-card__groups-sep {
  margin: 0 4px;
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
