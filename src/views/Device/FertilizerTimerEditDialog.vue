<template>
  <el-dialog
    :model-value="modelValue"
    width="640px"
    append-to-body
    destroy-on-close
    draggable
    overflow
    :close-on-click-modal="false"
    class="fertilizer-timer-edit-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <template #header>
      <div class="fertilizer-timer-edit-dialog__title">定时设置</div>
    </template>

    <div v-if="ready" class="fertilizer-timer-edit">
      <!-- 施肥模式选择 -->
      <div class="fertilizer-timer-edit__section">
        <div class="fertilizer-timer-edit__section-label">施肥模式选择</div>
        <div class="fertilizer-timer-edit__mode-row">
          <button
            v-for="opt in modeOptions"
            :key="opt.value"
            type="button"
            class="fertilizer-timer-edit__choice"
            :class="{ 'is-active': modeIndex === opt.value }"
            @click="modeIndex = opt.value"
          >
            <i
              class="iconfont"
              :class="modeIndex === opt.value ? 'icon-radio' : 'icon-radio1'"
            ></i>
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- 开始时间 / 施肥参数(按 fertMode) / 施肥时长 -->
      <div class="fertilizer-timer-edit__trio">
        <div class="fertilizer-timer-edit__field">
          <div class="fertilizer-timer-edit__section-label">开始时间</div>
          <el-date-picker
            v-model="startDateTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="MM/DD HH:mm"
            placeholder="选择开始时间"
            class="fertilizer-timer-edit__control"
            @change="onStartDateTimeChange"
          />
        </div>
        <div class="fertilizer-timer-edit__field">
          <div class="fertilizer-timer-edit__section-label">{{ fertParamLabel }}</div>
          <button
            type="button"
            class="fertilizer-timer-edit__picker"
            @click="onPickFertAmount"
          >
            <span>{{ fertAmountText }}</span>
          </button>
        </div>
        <div class="fertilizer-timer-edit__field">
          <div class="fertilizer-timer-edit__section-label">施肥时长</div>
          <button
            type="button"
            class="fertilizer-timer-edit__picker"
            @click="onPickDuration"
          >
            <span>{{ durationText }}</span>
            <i class="iconfont icon-device_ic_hourglass"></i>
          </button>
        </div>
      </div>

      <!-- 是否重复：对齐移动端 每天/间隔/周 -->
      <div class="fertilizer-timer-edit__section">
        <div class="fertilizer-timer-edit__section-label">是否重复</div>
        <div class="fertilizer-timer-edit__repeat-grid">
          <button
            v-for="opt in repeatOptions"
            :key="opt.value"
            type="button"
            class="fertilizer-timer-edit__choice"
            :class="{
              'is-active': paramInfo.timerConfig.repeatType === opt.value
            }"
            @click="paramInfo.timerConfig.repeatType = opt.value"
          >
            <i
              class="iconfont"
              :class="
                paramInfo.timerConfig.repeatType === opt.value
                  ? 'icon-radio'
                  : 'icon-radio1'
              "
            ></i>
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- 间隔重复：重复周期（天） -->
      <div
        v-if="paramInfo.timerConfig.repeatType === 1"
        class="fertilizer-timer-edit__section"
      >
        <div class="fertilizer-timer-edit__section-label">重复周期</div>
        <button
          type="button"
          class="fertilizer-timer-edit__picker is-full"
          @click="onPickIntervalDays"
        >
          <span>{{ intervalDaysText }}</span>
          <i class="iconfont icon-device_ic_run_01"></i>
        </button>
      </div>

      <!-- 周重复 -->
      <div
        v-if="paramInfo.timerConfig.repeatType === 2"
        class="fertilizer-timer-edit__section"
      >
        <div class="fertilizer-timer-edit__section-label">重复周期</div>
        <div class="fertilizer-timer-edit__weeks">
          <el-checkbox-group v-model="paramInfo.timerConfig.weekDays">
            <el-checkbox
              v-for="w in weekOptions"
              :key="w.value"
              :value="w.value"
              :label="w.value"
            >
              {{ w.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </div>

      <!-- 日期区间：对齐移动端始终展示 -->
      <div class="fertilizer-timer-edit__range">
        <i class="iconfont icon-device_ic_calendar fertilizer-timer-edit__range-icon"></i>
        <el-date-picker
          v-model="paramInfo.timerConfig.startDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
          class="fertilizer-timer-edit__range-picker"
        />
        <span class="fertilizer-timer-edit__range-sep">至</span>
        <el-date-picker
          v-model="paramInfo.timerConfig.endDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
          class="fertilizer-timer-edit__range-picker"
        />
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="fertilizer-timer-edit__save"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </template>

    <DurationPickerDialog ref="durationPickerRef" />
  </el-dialog>
</template>

<script setup>
/**
 * 施肥机定时设置弹窗（新增 / 编辑）
 * 布局对齐设计稿；业务对齐移动端 fertilizer_timer_edit（modifyProgramTopic）
 */
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fismartRrpc } from '@/api/device'
import {
  formatDurationFriendly,
  getNowDateStr,
  getNowTimeStr
} from '@/utils/programTime'
import DurationPickerDialog from '@/components/DurationPickerDialog.vue'

const DEFAULT_SEASON_ADJUST_LIST = [
  100, 100, 1, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100
]

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** add | edit */
  type: { type: String, default: 'add' },
  deviceInfo: { type: Object, default: null },
  /** 编辑时的原始 Pro 项 */
  proItem: { type: Object, default: null },
  /** 新增时已有 ProList（需一并提交） */
  existingProList: { type: Array, default: () => [] },
  /** 新增时下一个 ProgramIndex */
  nextProgramIndex: { type: [Number, String], default: 0 },
  seasonAdjustList: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const modeOptions = [
  { value: 0, label: '固定流量' },
  { value: 1, label: '固定总量' },
  { value: 2, label: '固定比例' }
]

/** 对齐移动端 arrayType：RunDate.Mode 0/1/2 */
const repeatOptions = [
  { value: 0, label: '每天重复' },
  { value: 1, label: '间隔重复' },
  { value: 2, label: '周重复' }
]

const weekOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' }
]

const durationPickerRef = ref(null)
const ready = ref(false)
const saving = ref(false)
const modeIndex = ref(0)
const proItemLocal = ref(null)
const seasonListLocal = ref([])
const existingListLocal = ref([])
const startDateTime = ref('')

const paramInfo = ref({
  timerConfig: {
    repeatType: 0,
    time: '',
    startDate: '',
    endDate: '',
    intervalDays: 1,
    weekDays: []
  },
  actionConfig: {
    duration: 4800,
    fertAmount: 5
  }
})

/** 对齐移动端：0 施肥流量 / 1 施肥量 / 2 水/肥比例 */
const fertParamLabel = computed(() => {
  const mode = Number(modeIndex.value)
  if (mode === 0) return '施肥流量'
  if (mode === 2) return '水/肥比例'
  return '施肥量'
})

const fertParamUnit = computed(() => {
  const mode = Number(modeIndex.value)
  if (mode === 0) return 'm³/h'
  if (mode === 2) return ''
  return 'm³'
})

const fertAmountText = computed(() => {
  const val = paramInfo.value.actionConfig.fertAmount
  if (val === null || val === undefined || val === '') return '--'
  const unit = fertParamUnit.value
  return unit ? `${val}${unit}` : String(val)
})

const durationText = computed(() => {
  const sec = Number(paramInfo.value.actionConfig.duration) || 0
  if (sec <= 0) return '请设置时长'
  return formatDurationFriendly(sec)
})

const intervalDaysText = computed(() => {
  const val = paramInfo.value.timerConfig.intervalDays
  if (val === null || val === undefined || val === '') return '--'
  return `${val}天`
})

function createDefaultProItem() {
  return {
    ATemp: '0.0',
    AdjustType: 0,
    ClashMode: 0,
    Enable: false,
    FPOT: 0,
    FPRT: 0,
    FormulaID: 0,
    FormulaNM: '配肥',
    IrrVol: '0.00',
    IrriMode: 1,
    LIO: '',
    LightThr: '1000.0',
    LightTime: 3600,
    LinkFlag: 1,
    LinkList: [],
    MaxOpenValve: 2,
    MinLight: '0',
    MinTime: 0,
    Name: '程序1',
    NextRunTime: '',
    ProgramIndex: 0,
    RainStop: false,
    RunDate: {
      EndDay: '2026.09.09',
      Interval: 1,
      Mask31: false,
      MaskWeek: 9,
      Mode: 0,
      StartDay: '2026.09.01',
      WeekDay: 0
    },
    RunRatio: 100,
    SoilThr: '0',
    StartTimeArr: ['02:00:00', '00:08:00', '关闭'],
    StartTypeArr: [0, 0, 0],
    StopTimeArr: ['02:10:00', '00:18:00', '关闭'],
    StopTypeArr: [0, 0, 0],
    SumRunTime: 600,
    TimeEnableArr: [1, 1, 1],
    UseZone: 0,
    ValveIdList: [
      'VL0-2',
      'VL0-3',
      'VL0-4',
      'VL0-6',
      'VL0-7',
      '001',
      '003',
      '004',
      '005',
      '006',
      '007',
      '008'
    ],
    ValveRunList: [600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ValveSetList: [600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ValveSoakList: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fertParam: {
      fertFlow: 1,
      fertMode: 0,
      fertRatio: 10,
      fertVolum: 1
    }
  }
}

function normalizeTimeStr(timeStr) {
  const str = String(timeStr || '').trim()
  if (!str) return '00:00:00'
  const parts = str.split(':')
  if (parts.length >= 3) {
    return parts
      .slice(0, 3)
      .map((p) => String(p).padStart(2, '0'))
      .join(':')
  }
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`
  }
  return str
}

function parseRunDateDay(dayStr) {
  const str = String(dayStr || '').trim()
  if (!str) return ''
  return str.replace(/\./g, '-')
}

function formatRunDateDay(dateStr) {
  const str = String(dateStr || '').trim()
  if (!str) return ''
  return str.replace(/-/g, '.')
}

/** WeekDay 位掩码 → weekDays（0=周日, 1~6=周一~周六） */
function bitmaskToWeekDays(weekDay) {
  const mask = Math.floor(Number(weekDay) || 0)
  if (mask <= 0) return []
  const weekDays = []
  for (let bit = 0; bit < 7; bit++) {
    if ((mask >> bit) & 1) {
      weekDays.push(bit === 6 ? 0 : bit + 1)
    }
  }
  return weekDays
}

function weekDaysToBitmask(weekDays) {
  let mask = 0
  ;(weekDays || []).forEach((val) => {
    const v = Number(val)
    if (v === 0) mask |= 1 << 6
    else if (v >= 1 && v <= 6) mask |= 1 << (v - 1)
  })
  return mask
}

function durationToSeconds(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number' && !Number.isNaN(val)) return Math.floor(val)
  const str = String(val).trim()
  if (/^\d+$/.test(str)) return Number(str)
  const parts = str.split(':').map(Number)
  if (parts.length >= 3) return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0)
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return 0
}

function getFertValueByMode(fertParam, mode) {
  const fert = fertParam || {}
  if (Number(mode) === 0) return fert.fertFlow
  if (Number(mode) === 2) return fert.fertRatio
  return fert.fertVolum
}

/** 整数原样；科学计数法按 0 处理，便于编辑 */
function normalizeFertFieldValue(val) {
  if (val === null || val === undefined || val === '') return 0
  const num = Number(val)
  if (!Number.isFinite(num)) return 0
  if (Number.isInteger(num)) return num
  if (/e/i.test(String(val))) return 0
  return num
}

function syncFertMode(mode) {
  if (!proItemLocal.value) return
  if (!proItemLocal.value.fertParam) proItemLocal.value.fertParam = {}
  const fertMode = Number(mode) || 0
  proItemLocal.value.fertParam.fertMode = fertMode
  paramInfo.value.actionConfig.fertAmount = normalizeFertFieldValue(
    getFertValueByMode(proItemLocal.value.fertParam, fertMode)
  )
}

function syncFertParamValue(amount) {
  if (!proItemLocal.value?.fertParam) return
  const val =
    amount !== undefined ? amount : paramInfo.value.actionConfig.fertAmount
  const num = Number(val) || 0
  const mode = Number(modeIndex.value)
  if (mode === 0) {
    proItemLocal.value.fertParam.fertFlow = num
    return
  }
  if (mode === 2) {
    proItemLocal.value.fertParam.fertRatio = num
    return
  }
  proItemLocal.value.fertParam.fertVolum = num
}

function syncDuration(duration) {
  if (!proItemLocal.value) return
  const val =
    duration !== undefined ? duration : paramInfo.value.actionConfig.duration
  const seconds = durationToSeconds(val)
  proItemLocal.value.SumRunTime = seconds
  if (Array.isArray(proItemLocal.value.ValveRunList) && proItemLocal.value.ValveRunList.length) {
    proItemLocal.value.ValveRunList[0] = seconds
  }
  if (Array.isArray(proItemLocal.value.ValveSetList) && proItemLocal.value.ValveSetList.length) {
    proItemLocal.value.ValveSetList[0] = seconds
  }
}

function syncStartTime(time) {
  if (!proItemLocal.value) return
  const val = time !== undefined ? time : paramInfo.value.timerConfig.time
  const timeStr = normalizeTimeStr(val)
  if (
    Array.isArray(proItemLocal.value.StartTimeArr) &&
    proItemLocal.value.StartTimeArr.length
  ) {
    proItemLocal.value.StartTimeArr[0] = timeStr
  }
}

function syncRunDate() {
  if (!proItemLocal.value) return
  if (!proItemLocal.value.RunDate) proItemLocal.value.RunDate = {}
  const cfg = paramInfo.value.timerConfig
  const mode = Number(cfg.repeatType) || 0
  proItemLocal.value.RunDate.Mode = mode
  proItemLocal.value.RunDate.StartDay = formatRunDateDay(cfg.startDate)
  proItemLocal.value.RunDate.EndDay = formatRunDateDay(cfg.endDate)
  if (mode === 1) {
    proItemLocal.value.RunDate.Interval = Number(cfg.intervalDays) || 0
  }
  if (mode === 2) {
    proItemLocal.value.RunDate.WeekDay = weekDaysToBitmask(cfg.weekDays)
  } else {
    proItemLocal.value.RunDate.WeekDay = 0
  }
}

function syncAllMappedFields() {
  syncFertMode(modeIndex.value)
  syncFertParamValue()
  syncDuration()
  syncStartTime()
  syncRunDate()
}

function syncStartDateTimeField() {
  const date = paramInfo.value.timerConfig.startDate || getNowDateStr()
  const time = normalizeTimeStr(paramInfo.value.timerConfig.time || getNowTimeStr())
  startDateTime.value = `${date} ${time}`
}

function onStartDateTimeChange(val) {
  if (!val) return
  const [date, time] = String(val).split(' ')
  if (date) paramInfo.value.timerConfig.startDate = date
  if (time) paramInfo.value.timerConfig.time = normalizeTimeStr(time)
}

function fillFormFromProItem(pro) {
  const fert = pro.fertParam || {}
  modeIndex.value = Number(fert.fertMode) || 0
  paramInfo.value.actionConfig.duration = Number(pro.SumRunTime) || 0
  paramInfo.value.actionConfig.fertAmount = normalizeFertFieldValue(
    getFertValueByMode(fert, modeIndex.value)
  )

  const startTime =
    pro.StartTimeArr && pro.StartTimeArr.length ? pro.StartTimeArr[0] : ''
  paramInfo.value.timerConfig.time = normalizeTimeStr(startTime)

  const runDate = pro.RunDate || {}
  paramInfo.value.timerConfig.repeatType = Number(runDate.Mode) || 0
  paramInfo.value.timerConfig.startDate = parseRunDateDay(runDate.StartDay)
  paramInfo.value.timerConfig.endDate = parseRunDateDay(runDate.EndDay)
  paramInfo.value.timerConfig.intervalDays = Number(runDate.Interval) || 1
  paramInfo.value.timerConfig.weekDays = bitmaskToWeekDays(runDate.WeekDay)
  syncStartDateTimeField()
}

function onPickDuration() {
  durationPickerRef.value?.open(
    paramInfo.value.actionConfig.duration || 0,
    (total) => {
      paramInfo.value.actionConfig.duration = total
    }
  )
}

async function onPickFertAmount() {
  const label = fertParamLabel.value
  const unit = fertParamUnit.value
  const current = paramInfo.value.actionConfig.fertAmount
  const promptText = unit ? `请输入${label}（${unit}）` : `请输入${label}`
  try {
    const { value } = await ElMessageBox.prompt(promptText, label, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: current != null && current !== '' ? String(current) : '0',
      inputPattern: /^\d+(\.\d+)?$/,
      inputErrorMessage: '请输入有效数字',
      appendTo: 'body'
    })
    const num = Number(value)
    if (!(num >= 0 && num <= 9999)) {
      ElMessage.warning(`${label}需在 0~9999 之间`)
      return
    }
    paramInfo.value.actionConfig.fertAmount = Math.round(num * 10) / 10
  } catch {
    /* cancel */
  }
}

async function onPickIntervalDays() {
  const current = paramInfo.value.timerConfig.intervalDays
  try {
    const { value } = await ElMessageBox.prompt('请输入重复周期（天）', '重复周期', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: current != null && current !== '' ? String(current) : '1',
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: '请输入 1~999 的整数',
      appendTo: 'body'
    })
    const num = Number(value)
    if (!(num >= 1 && num <= 999)) {
      ElMessage.warning('重复周期需在 1~999 天')
      return
    }
    paramInfo.value.timerConfig.intervalDays = num
  } catch {
    /* cancel */
  }
}

function startGtEnd(startDate, endDate) {
  const s = new Date(startDate).getTime()
  const e = new Date(endDate).getTime()
  return s > e
}

function buildModifyProgramPayload() {
  syncAllMappedFields()
  const newPro = JSON.parse(JSON.stringify(proItemLocal.value))
  let proList = [newPro]
  if (props.type === 'add' && existingListLocal.value.length) {
    proList = existingListLocal.value
      .map((item) => JSON.parse(JSON.stringify(item)))
      .concat([newPro])
  }
  return {
    MsgType: 'modifyProgramTopic',
    Code: props.type === 'add' ? 1 : 0,
    Data: {
      SeasonAdjustList: seasonListLocal.value.slice(),
      ProList: proList
    }
  }
}

async function onSave() {
  if ((paramInfo.value.actionConfig.duration || 0) <= 0) {
    ElMessage.warning('请设置打开时长')
    return
  }
  const amount = Number(paramInfo.value.actionConfig.fertAmount)
  if (!(amount > 0)) {
    ElMessage.warning(`请设置${fertParamLabel.value}`)
    return
  }

  const repeatType = paramInfo.value.timerConfig.repeatType
  if (
    !paramInfo.value.timerConfig.startDate ||
    !paramInfo.value.timerConfig.endDate
  ) {
    ElMessage.warning('请设置开始日期和结束日期')
    return
  }
  if (
    startGtEnd(
      paramInfo.value.timerConfig.startDate,
      paramInfo.value.timerConfig.endDate
    )
  ) {
    ElMessage.warning('开始日期不能大于结束日期')
    return
  }
  if (repeatType === 1) {
    if (!(Number(paramInfo.value.timerConfig.intervalDays) > 0)) {
      ElMessage.warning('请设置重复周期')
      return
    }
  }
  if (repeatType === 2) {
    if (!paramInfo.value.timerConfig.weekDays?.length) {
      ElMessage.warning('周重复需要至少选择一天')
      return
    }
  }

  const deviceId = props.deviceInfo?.id
  if (deviceId == null || deviceId === '') {
    ElMessage.warning('设备信息缺失')
    return
  }
  if (!Array.isArray(seasonListLocal.value) || !seasonListLocal.value.length) {
    ElMessage.warning('季节调整数据缺失')
    return
  }

  saving.value = true
  try {
    const body = buildModifyProgramPayload()
    const res = await fismartRrpc(deviceId, body, {
      silent: false,
      loading: true
    })
    if (res?.code == 200) {
      ElMessage.success('保存成功')
      emit('saved')
      onVisibleChange(false)
    }
  } catch (e) {
    console.error('[FertilizerTimerEditDialog] 保存失败', e)
  } finally {
    saving.value = false
  }
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

function onOpened() {
  ready.value = false
  if (!props.deviceInfo?.id) {
    ElMessage.warning('设备信息缺失')
    onVisibleChange(false)
    return
  }

  if (props.type === 'edit') {
    if (!props.proItem) {
      ElMessage.warning('编辑数据缺失')
      onVisibleChange(false)
      return
    }
    proItemLocal.value = JSON.parse(JSON.stringify(props.proItem))
    seasonListLocal.value =
      Array.isArray(props.seasonAdjustList) && props.seasonAdjustList.length
        ? props.seasonAdjustList.slice()
        : DEFAULT_SEASON_ADJUST_LIST.slice()
    existingListLocal.value = []
    fillFormFromProItem(proItemLocal.value)
  } else {
    seasonListLocal.value =
      Array.isArray(props.seasonAdjustList) && props.seasonAdjustList.length
        ? props.seasonAdjustList.slice()
        : DEFAULT_SEASON_ADJUST_LIST.slice()
    existingListLocal.value = Array.isArray(props.existingProList)
      ? props.existingProList.map((item) => JSON.parse(JSON.stringify(item)))
      : []
    proItemLocal.value = createDefaultProItem()
    const nextIndex = Number(props.nextProgramIndex)
    if (Number.isFinite(nextIndex)) {
      proItemLocal.value.ProgramIndex = nextIndex
    }
    modeIndex.value = Number(proItemLocal.value.fertParam?.fertMode) || 0
    const nowDate = getNowDateStr()
    const nowTime = getNowTimeStr()
    paramInfo.value.timerConfig.time = nowTime
    paramInfo.value.timerConfig.startDate = nowDate
    paramInfo.value.timerConfig.endDate = nowDate
    paramInfo.value.timerConfig.repeatType = 0
    paramInfo.value.timerConfig.intervalDays = 1
    paramInfo.value.timerConfig.weekDays = []
    // 对齐移动端新增默认：打开时长 4800s；施肥参数由 syncFertMode 按模式字段回填
    paramInfo.value.actionConfig.duration = 4800
    paramInfo.value.actionConfig.fertAmount = 5
    syncStartDateTimeField()
    syncAllMappedFields()
  }
  ready.value = true
}

watch(modeIndex, (val) => syncFertMode(val))
watch(
  () => paramInfo.value.actionConfig.duration,
  (val) => syncDuration(val)
)
watch(
  () => paramInfo.value.actionConfig.fertAmount,
  (val) => syncFertParamValue(val)
)
watch(
  () => paramInfo.value.timerConfig.time,
  (val) => syncStartTime(val)
)
watch(
  () => paramInfo.value.timerConfig.repeatType,
  () => syncRunDate()
)
watch(
  () => paramInfo.value.timerConfig.startDate,
  () => {
    syncRunDate()
    syncStartDateTimeField()
  }
)
watch(
  () => paramInfo.value.timerConfig.endDate,
  () => syncRunDate()
)
watch(
  () => paramInfo.value.timerConfig.intervalDays,
  () => syncRunDate()
)
watch(
  () => paramInfo.value.timerConfig.weekDays,
  () => syncRunDate(),
  { deep: true }
)
</script>

<style scoped>
.fertilizer-timer-edit {
  --fert-control-h: 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 280px;
  padding: 4px 0 8px;
}

.fertilizer-timer-edit__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fertilizer-timer-edit__section-label {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.4;
}

.fertilizer-timer-edit__mode-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.fertilizer-timer-edit__repeat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.fertilizer-timer-edit__choice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
}

.fertilizer-timer-edit__choice .iconfont {
  font-size: 18px;
  color: #c0c4cc;
  line-height: 1;
}

.fertilizer-timer-edit__choice.is-active {
  border-color: #3653a0;
  color: #3653a0;
  font-weight: 600;
  background: rgba(54, 83, 160, 0.04);
}

.fertilizer-timer-edit__choice.is-active .iconfont {
  color: #3653a0;
}

.fertilizer-timer-edit__trio {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.fertilizer-timer-edit__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.fertilizer-timer-edit__control {
  width: 100%;
}

.fertilizer-timer-edit__picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: var(--fert-control-h);
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
  text-align: left;
}

.fertilizer-timer-edit__picker.is-full {
  width: 100%;
}

.fertilizer-timer-edit__picker .iconfont {
  font-size: 16px;
  color: #909399;
}

.fertilizer-timer-edit__weeks {
  padding: 4px 0;
}

.fertilizer-timer-edit__range {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #f3f5f9;
  box-sizing: border-box;
}

.fertilizer-timer-edit__range-icon {
  flex-shrink: 0;
  font-size: 18px;
  color: #3653a0;
}

.fertilizer-timer-edit__range-sep {
  flex-shrink: 0;
  font-size: 13px;
  color: #909399;
}

.fertilizer-timer-edit__range-picker {
  flex: 1;
  min-width: 0;
}

.fertilizer-timer-edit__save {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: #3653a0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(54, 83, 160, 0.28);
}

.fertilizer-timer-edit__save:hover:not(:disabled) {
  background: #2f4a90;
}

.fertilizer-timer-edit__save:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>

<style>
.fertilizer-timer-edit-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.fertilizer-timer-edit-dialog .el-dialog__body {
  padding-top: 8px;
}

.fertilizer-timer-edit-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
  padding-bottom: 8px;
}

.fertilizer-timer-edit-dialog__title {
  font-size: 20px;
  font-weight: bold;
  color: #1a3b87;
  line-height: 1.2;
}

.fertilizer-timer-edit-dialog .el-dialog__footer {
  padding-top: 8px;
  padding-bottom: 20px;
}

.fertilizer-timer-edit-dialog .fertilizer-timer-edit__control.el-date-editor,
.fertilizer-timer-edit-dialog .fertilizer-timer-edit__range-picker.el-date-editor {
  width: 100%;
}

.fertilizer-timer-edit-dialog .fertilizer-timer-edit__control .el-input__wrapper,
.fertilizer-timer-edit-dialog .fertilizer-timer-edit__range-picker .el-input__wrapper {
  min-height: 40px;
}
</style>
