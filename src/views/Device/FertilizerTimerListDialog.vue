<template>
  <el-dialog
    :model-value="modelValue"
    width="720px"
    append-to-body
    destroy-on-close
    draggable
    overflow
    :close-on-click-modal="false"
    class="fertilizer-timer-list-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <template #header>
      <div class="fertilizer-timer-list-dialog__title">
        {{ dialogTitle }}
      </div>
    </template>

    <div v-loading="loading" class="fertilizer-timer-list">
      <!-- 空状态：对齐设计稿图2 -->
      <div v-if="!proList.length && !loading" class="fertilizer-timer-list__empty">
        <img
          class="fertilizer-timer-list__empty-img"
          :src="emptyTimingImg"
          alt=""
        />
        <p class="fertilizer-timer-list__empty-text">无定时，请添加定时</p>
        <button
          type="button"
          class="fertilizer-timer-list__empty-btn"
          @click="onAdd"
        >
          添加定时设置
        </button>
      </div>

      <!-- 有数据：3 列卡片 + 末尾添加卡，超出纵向滚动 -->
      <div v-else-if="proList.length" class="fertilizer-timer-list__grid">
        <article
          v-for="(item, index) in proList"
          :key="item.id ?? index"
          class="fertilizer-timer-card"
          @click="onDetail(item)"
        >
          <div class="fertilizer-timer-card__head">
            <div class="fertilizer-timer-card__head-left">
              <span class="fertilizer-timer-card__time">{{ item.time }}</span>
              <span class="fertilizer-timer-card__name">{{ item.name }}</span>
            </div>
            <el-switch
              :model-value="!!item.enabled"
              @click.stop
              @change="(val) => onEnableChange(item, val)"
            />
          </div>

          <div class="fertilizer-timer-card__details">
            <div class="fertilizer-timer-card__row">
              <i class="iconfont icon-device_ic_run_01"></i>
              <span>{{ item.repeatText }}</span>
            </div>
            <div class="fertilizer-timer-card__row">
              <i class="iconfont icon-device_ic_hourglass"></i>
              <span>时长: {{ item.durationText }}</span>
            </div>
            <div class="fertilizer-timer-card__row">
              <i class="iconfont icon-device_ic_hourglass"></i>
              <span>{{ item.fertParamLabel }}: {{ item.fertParamText }}</span>
            </div>
          </div>
        </article>

        <button
          type="button"
          class="fertilizer-timer-card fertilizer-timer-card--add"
          @click="onAdd"
        >
          <i class="iconfont icon-device_ic_add"></i>
          <span>添加定时控制</span>
        </button>
      </div>
    </div>

    <FertilizerTimerEditDialog
      v-model="editVisible"
      :type="editType"
      :device-info="props.deviceInfo"
      :pro-item="editProItem"
      :existing-pro-list="editExistingProList"
      :next-program-index="editNextProgramIndex"
      :season-adjust-list="editSeasonAdjustList"
      @saved="onEditSaved"
    />
  </el-dialog>
</template>

<script setup>
/**
 * 施肥机定时列表弹窗
 * 布局对齐设计稿；业务对齐移动端 fertilizer_timer_list（getProgramTopic / modifyProgramTopic）
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fismartRrpc } from '@/api/device'
import { second2Time } from '@/utils/programTime'
import FertilizerTimerEditDialog from './FertilizerTimerEditDialog.vue'
import emptyTimingImg from '@/assets/irrigation-group/device_img_timing.png'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 设备 id，缺省时用 farmStore.s_control_device */
  deviceId: { type: [Number, String], default: null },
  deviceInfo: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])

const editVisible = ref(false)
const editType = ref('add')
const editProItem = ref(null)
const editExistingProList = ref([])
const editNextProgramIndex = ref(0)
const editSeasonAdjustList = ref([])

/** RunDate.WeekDay 位掩码：bit0~bit6 分别表示周一~周日 */
const WEEK_DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const loading = ref(false)
const proList = ref([])
const seasonAdjustList = ref([])

const dialogTitle = computed(() =>
  !loading.value && !proList.value.length ? '定时' : '定时控制'
)

function resolveDeviceId() {
  if (props.deviceId != null && props.deviceId !== '') return props.deviceId
  return props.deviceInfo?.id ?? null
}

function formatStartTime(startTimeArr) {
  const raw = startTimeArr?.length ? startTimeArr[0] : ''
  if (!raw || raw === '关闭') return '--'
  const parts = String(raw).split(':')
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
  }
  return String(raw)
}

function parseWeekDayMask(weekDay) {
  if (weekDay === null || weekDay === undefined || weekDay === '') return 0
  if (typeof weekDay === 'number' && Number.isFinite(weekDay)) {
    return Math.floor(weekDay)
  }
  const str = String(weekDay).trim()
  if (!str) return 0
  if (/^0b[01]+$/i.test(str)) return parseInt(str.slice(2), 2)
  const num = Number(str)
  return Number.isFinite(num) ? Math.floor(num) : 0
}

/** 设计稿缩写：周二、三、四、五 */
function getWeekDayText(weekDay) {
  const mask = parseWeekDayMask(weekDay)
  if (mask <= 0) return ''
  const selected = []
  for (let bit = 0; bit < WEEK_DAY_LABELS.length; bit++) {
    if ((mask >> bit) & 1) selected.push(WEEK_DAY_LABELS[bit])
  }
  return selected.join('、').replace(/、周/g, '、')
}

function getRepeatText(runDate = {}) {
  const mode = Number(runDate.Mode)
  if (mode === 0) return '每天重复'
  if (mode === 1) {
    const interval = runDate.Interval
    if (interval === null || interval === undefined || interval === '') {
      return '重复周期：--'
    }
    return `重复周期：${interval}天`
  }
  if (mode === 2) return getWeekDayText(runDate.WeekDay) || '--'
  return '--'
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || seconds === '') return '--'
  return second2Time(seconds)
}

/** 施肥流量 / 水肥比例：整数原样展示，科学计数法展示 0.0 */
function formatIntOrScientificValue(val) {
  if (val === null || val === undefined || val === '') return '--'
  const num = Number(val)
  if (!Number.isFinite(num)) return '--'
  if (Number.isInteger(num)) return String(num)
  if (/e/i.test(String(val))) return '0.0'
  return String(val)
}

function formatFertVolumText(val) {
  if (val === null || val === undefined || val === '') return '--'
  return `${val}m³`
}

/**
 * 对齐移动端 formatFertParamDisplay
 * fertMode：0 施肥流量 fertFlow(m³/h)；1 施肥量 fertVolum(m³)；2 水/肥比例 fertRatio(无单位)
 */
function formatFertParamDisplay(fertParam) {
  const fert = fertParam || {}
  const mode = Number(fert.fertMode)
  if (mode === 0) {
    const text = formatIntOrScientificValue(fert.fertFlow)
    return {
      fertParamLabel: '施肥流量',
      fertParamText: text === '--' ? '--' : `${text}m³/h`
    }
  }
  if (mode === 2) {
    return {
      fertParamLabel: '水/肥比例',
      fertParamText: formatIntOrScientificValue(fert.fertRatio)
    }
  }
  return {
    fertParamLabel: '施肥量',
    fertParamText: formatFertVolumText(fert.fertVolum)
  }
}

function mapProItem(pro, index) {
  const runDate = pro?.RunDate || {}
  return {
    id: pro?.ProgramIndex != null ? pro.ProgramIndex : index,
    rawPro: JSON.parse(JSON.stringify(pro)),
    time: formatStartTime(pro?.StartTimeArr),
    name: '施肥',
    enabled: !!pro?.Enable,
    repeatText: getRepeatText(runDate),
    durationText: formatDuration(pro?.SumRunTime),
    ...formatFertParamDisplay(pro?.fertParam)
  }
}

function mapProList(list) {
  if (!Array.isArray(list) || !list.length) return []
  return list.map((pro, index) => mapProItem(pro, index))
}

function applyProgramPayload(payload) {
  const data = payload?.Data || {}
  const list = data.ProList
  if (Array.isArray(list) && list.length) {
    seasonAdjustList.value = Array.isArray(data.SeasonAdjustList)
      ? data.SeasonAdjustList.slice()
      : []
  } else {
    seasonAdjustList.value = []
  }
  proList.value = mapProList(list)
}

async function loadProgramList(showLoading = true) {
  const deviceId = resolveDeviceId()
  if (deviceId == null || deviceId === '') {
    ElMessage.warning('设备信息缺失')
    return
  }
  if (showLoading) loading.value = true
  try {
    const res = await fismartRrpc(
      deviceId,
      { MsgType: 'getProgramTopic', Code: 0, Data: 64 },
      { silent: !showLoading, loading: false }
    )
    if (res?.code == 200) {
      applyProgramPayload(res.data)
    }
  } catch (e) {
    console.error('[FertilizerTimerListDialog] 获取定时列表失败', e)
    if (showLoading) {
      proList.value = []
      seasonAdjustList.value = []
    }
  } finally {
    if (showLoading) loading.value = false
  }
}

/** 取 ProList 中 ProgramIndex 最大值 + 1，无数据时从 0 开始 */
function getNextProgramIndex() {
  if (!proList.value.length) return 0
  let maxIndex = -1
  proList.value.forEach((item) => {
    const idx = Number(item.rawPro?.ProgramIndex)
    if (Number.isFinite(idx) && idx > maxIndex) maxIndex = idx
  })
  return maxIndex + 1
}

function openEdit(type, item = null) {
  editType.value = type
  if (type === 'edit') {
    editProItem.value = item?.rawPro
      ? JSON.parse(JSON.stringify(item.rawPro))
      : null
    editExistingProList.value = []
    editNextProgramIndex.value = 0
    editSeasonAdjustList.value = seasonAdjustList.value.slice()
  } else {
    editProItem.value = null
    editExistingProList.value = proList.value
      .map((row) =>
        row.rawPro ? JSON.parse(JSON.stringify(row.rawPro)) : null
      )
      .filter(Boolean)
    editNextProgramIndex.value = getNextProgramIndex()
    editSeasonAdjustList.value = seasonAdjustList.value.length
      ? seasonAdjustList.value.slice()
      : []
  }
  editVisible.value = true
}

function onAdd() {
  if (!props.deviceInfo?.id && resolveDeviceId() == null) {
    ElMessage.warning('设备信息缺失')
    return
  }
  openEdit('add')
}

function onDetail(item) {
  if (!item?.rawPro) return
  if (!seasonAdjustList.value.length) {
    ElMessage.warning('季节调整数据缺失')
    return
  }
  openEdit('edit', item)
}

function onEditSaved() {
  loadProgramList(true)
}

async function onEnableChange(item, check) {
  if (!item?.rawPro) return
  const deviceId = resolveDeviceId()
  if (deviceId == null || deviceId === '') {
    item.enabled = !check
    return
  }
  if (!seasonAdjustList.value.length) {
    ElMessage.warning('季节调整数据缺失')
    item.enabled = !check
    return
  }

  const proPayload = JSON.parse(JSON.stringify(item.rawPro))
  proPayload.Enable = !!check
  item.enabled = !!check

  try {
    const res = await fismartRrpc(
      deviceId,
      {
        MsgType: 'modifyProgramTopic',
        Code: 0,
        Data: {
          SeasonAdjustList: seasonAdjustList.value.slice(),
          ProList: [proPayload]
        }
      },
      { silent: false, loading: true }
    )
    if (res?.code == 200) {
      await loadProgramList(false)
    } else {
      item.enabled = !check
    }
  } catch {
    item.enabled = !check
  }
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

function onOpened() {
  proList.value = []
  seasonAdjustList.value = []
  loadProgramList(true)
}
</script>

<style scoped>
.fertilizer-timer-list {
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.fertilizer-timer-list__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  padding: 4px 0 8px;
  max-height: 520px;
  overflow-y: auto;
  box-sizing: border-box;
}

.fertilizer-timer-card {
  padding: 14px 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #edf1f7;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  cursor: pointer;
  box-sizing: border-box;
  text-align: left;
  font: inherit;
  color: inherit;
}

.fertilizer-timer-card:hover {
  border-color: #c5d0ea;
}

.fertilizer-timer-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.fertilizer-timer-card__head-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.fertilizer-timer-card__time {
  font-size: 24px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1.2;
}

.fertilizer-timer-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 20px;
}

.fertilizer-timer-card__details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.fertilizer-timer-card__row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  font-size: 13px;
  color: #606266;
  line-height: 20px;
}

.fertilizer-timer-card__row .iconfont {
  flex-shrink: 0;
  font-size: 15px;
  color: #3653a0;
  line-height: 1;
}

.fertilizer-timer-card--add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 168px;
  border: 1px dashed #c0c4cc;
  box-shadow: none;
  background: #fafbfc;
  color: #909399;
  font-size: 14px;
}

.fertilizer-timer-card--add:hover {
  border-color: #3653a0;
  color: #3653a0;
  background: #f5f7fb;
}

.fertilizer-timer-card--add .iconfont {
  font-size: 28px;
  line-height: 1;
  color: inherit;
}

.fertilizer-timer-list__empty {
  flex: 1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 24px 32px;
  box-sizing: border-box;
}

.fertilizer-timer-list__empty-img {
  width: 210px;
  height: auto;
  object-fit: contain;
  display: block;
  margin-bottom: 16px;
  user-select: none;
  pointer-events: none;
}

.fertilizer-timer-list__empty-text {
  margin: 0 0 28px;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.fertilizer-timer-list__empty-btn {
  min-width: 180px;
  height: 44px;
  padding: 0 28px;
  border: none;
  border-radius: 12px;
  background: #3653a0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(54, 83, 160, 0.28);
}

.fertilizer-timer-list__empty-btn:hover {
  background: #2f4a90;
}

@media (max-width: 780px) {
  .fertilizer-timer-list__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<style>
.fertilizer-timer-list-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.fertilizer-timer-list-dialog .el-dialog__body {
  padding-top: 8px;
}

.fertilizer-timer-list-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
  padding-bottom: 8px;
}

.fertilizer-timer-list-dialog .el-dialog__footer {
  display: none;
}

.fertilizer-timer-list-dialog__title {
  font-size: 20px;
  font-weight: bold;
  color: #1a3b87;
  line-height: 1.2;
}
</style>
