<template>
  <el-dialog
    :model-value="modelValue"
    width="560px"
    append-to-body
    destroy-on-close
    draggable
    overflow
    :close-on-click-modal="false"
    class="timer-pro-edit-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <template #header>
      <div class="timer-pro-edit-dialog__title">定时设置</div>
    </template>

    <div v-if="paramInfo" class="timer-pro-edit">
      <!-- 设备：出水口选择 -->
      <div v-if="from === 'device'" class="timer-pro-edit__section">
        <div class="timer-pro-edit__section-label">出水口选择</div>
        <div class="timer-pro-edit__ports">
          <button
            v-for="port in arrayPort"
            :key="port.value"
            type="button"
            class="timer-pro-edit__choice"
            :class="{ 'is-active': isPortSelected(port.value) }"
            @click="onTogglePort(port.value)"
          >
            <i
              class="iconfont"
              :class="
                isPortSelected(port.value) ? 'icon-radio' : 'icon-radio1'
              "
            ></i>
            <span>{{ port.name }}</span>
          </button>
        </div>
      </div>

      <!-- 打开时间 + 打开时长 并排 -->
      <div class="timer-pro-edit__duo">
        <div class="timer-pro-edit__field">
          <div class="timer-pro-edit__section-label">打开时间</div>
          <el-date-picker
            v-if="paramInfo.timerConfig.repeatType === 0"
            v-model="openDateTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY年MM月DD日 HH:mm"
            placeholder="选择打开时间"
            class="timer-pro-edit__control"
            @change="onOpenDateTimeChange"
          />
          <el-time-picker
            v-else
            v-model="openTimeOnly"
            value-format="HH:mm:ss"
            format="HH:mm"
            placeholder="选择打开时间"
            class="timer-pro-edit__control"
            @change="onOpenTimeOnlyChange"
          />
        </div>
        <div class="timer-pro-edit__field">
          <div class="timer-pro-edit__section-label">打开时长</div>
          <button
            type="button"
            class="timer-pro-edit__picker"
            @click="onPickDuration"
          >
            <span>{{ formatDurationFriendly(paramInfo.actionConfig.duration) }}</span>
            <i class="iconfont icon-device_ic_hourglass"></i>
          </button>
        </div>
      </div>

      <!-- 是否重复：2x2 卡片 -->
      <div class="timer-pro-edit__section">
        <div class="timer-pro-edit__section-label">是否重复</div>
        <div class="timer-pro-edit__repeat-grid">
          <button
            v-for="opt in repeatOptions"
            :key="opt.value"
            type="button"
            class="timer-pro-edit__choice"
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

      <!-- 间隔重复规则 -->
      <div
        v-if="paramInfo.timerConfig.repeatType === 1"
        class="timer-pro-edit__section"
      >
        <div class="timer-pro-edit__section-label">重复周期</div>
        <button
          type="button"
          class="timer-pro-edit__picker is-full"
          @click="onPickInterval"
        >
          <span>{{ formatIntervalDisplay(paramInfo.timerConfig.interval) }}</span>
          <i class="iconfont icon-device_ic_run_01"></i>
        </button>
        <div class="timer-pro-edit__range">
          <i class="iconfont icon-device_ic_timing timer-pro-edit__range-icon"></i>
          <el-date-picker
            v-model="paramInfo.timerConfig.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="开始日期"
            class="timer-pro-edit__range-picker"
          />
          <span class="timer-pro-edit__range-sep">至</span>
          <el-date-picker
            v-model="paramInfo.timerConfig.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="结束日期"
            class="timer-pro-edit__range-picker"
          />
        </div>
      </div>

      <!-- 周重复规则 -->
      <div
        v-if="paramInfo.timerConfig.repeatType === 2"
        class="timer-pro-edit__section"
      >
        <div class="timer-pro-edit__section-label">重复周期</div>
        <div class="timer-pro-edit__weeks">
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
        <div class="timer-pro-edit__range">
          <i class="iconfont icon-device_ic_timing timer-pro-edit__range-icon"></i>
          <el-date-picker
            v-model="paramInfo.timerConfig.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="开始日期"
            class="timer-pro-edit__range-picker"
          />
          <span class="timer-pro-edit__range-sep">至</span>
          <el-date-picker
            v-model="paramInfo.timerConfig.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="结束日期"
            class="timer-pro-edit__range-picker"
          />
        </div>
      </div>

      <!-- 自定义日期规则 -->
      <div
        v-if="paramInfo.timerConfig.repeatType === 3"
        class="timer-pro-edit__section"
      >
        <div class="timer-pro-edit__section-label">自定义日期</div>
        <el-date-picker
          v-model="paramInfo.timerConfig.dates"
          type="dates"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          class="timer-pro-edit__control is-full"
        />
      </div>
    </div>

    <template #footer>
      <div class="timer-pro-edit__footer">
        <button
          type="button"
          class="timer-pro-edit__save"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <el-button
          v-if="type !== 'add'"
          type="danger"
          plain
          class="timer-pro-edit__delete"
          :loading="deleting"
          @click="onDelete"
        >
          删除
        </el-button>
      </div>
    </template>

    <DurationPickerDialog ref="durationPickerRef" />
  </el-dialog>
</template>

<script setup>
/**
 * 定时添加/编辑弹窗
 * 对齐移动端 pages/home/activity/base/time_pro/edit_pro（from=group|device）
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addTimePro, deleteTimePro, updateTimePro } from '@/api/deviceTask'
import { useFarmStore } from '@/store/farm'
import {
  formatDurationFriendly,
  getNowDateStr,
  getNowTimeStr
} from '@/utils/programTime'
import DurationPickerDialog from '@/components/DurationPickerDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  from: { type: String, default: 'group' },
  type: { type: String, default: 'add' },
  event: { type: String, default: '' },
  targetId: { type: [Number, String], default: null },
  targetType: { type: Number, default: 1 }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const farmStore = useFarmStore()
const durationPickerRef = ref(null)
const paramInfo = ref(null)
const openDateTime = ref('')
const openTimeOnly = ref('')
const saving = ref(false)
const deleting = ref(false)
const arrayPort = ref([])

const weekOptions = [
  { value: 0, label: '周天' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' }
]

const repeatOptions = [
  { value: 0, label: '不重复' },
  { value: 1, label: '间隔重复' },
  { value: 2, label: '周重复' },
  { value: 3, label: '自定义日期' }
]

/** 间隔周期展示：整小时显示 Nh，否则友好文案 */
function formatIntervalDisplay(seconds) {
  const sec = parseInt(seconds, 10) || 0
  if (sec <= 0) return '请设置周期'
  if (sec % 3600 === 0) return `${sec / 3600}h`
  return formatDurationFriendly(sec)
}

function getFarmId() {
  return (
    farmStore.s_selectFarm?.id ??
    farmStore.selectFarm?.id ??
    farmStore.s_farm_info?.id ??
    null
  )
}

function getDevicePorts() {
  const status = farmStore.s_dv_status_info
  const device = farmStore.s_control_device
  return (
    status?.waterOutletPile?.ports ||
    device?.specificData?.waterOutletPile?.ports ||
    device?.waterOutletPile?.ports ||
    []
  )
}

function buildArrayPort() {
  const ports = getDevicePorts()
  arrayPort.value = ports.map((item) => ({
    value: Number(item.outletNo),
    name: `${item.outletName || ''}出水口`
  }))
}

function isPortSelected(outletNo) {
  const list = paramInfo.value?.actionConfig?.outPorts
  if (!Array.isArray(list)) return false
  return list.some((p) => Number(p.outletNo) === Number(outletNo))
}

/** 对齐移动端 a-chose-port 单选：点已选取消，未选则只留当前 */
function onTogglePort(outletNo) {
  if (!paramInfo.value?.actionConfig) return
  if (isPortSelected(outletNo)) {
    paramInfo.value.actionConfig.outPorts = []
  } else {
    paramInfo.value.actionConfig.outPorts = [
      { outletNo: Number(outletNo), opening: 0 }
    ]
  }
}

function createDefaultParam() {
  const nowDate = getNowDateStr()
  const nowTime = getNowTimeStr()
  return {
    farmId: getFarmId(),
    name: '',
    targetType: props.targetType,
    targetId: props.targetId,
    enabled: true,
    timerConfig: {
      repeatType: 0,
      time: nowTime,
      dates: [nowDate],
      startDate: nowDate,
      endDate: nowDate,
      interval: 0,
      weekDays: []
    },
    actionConfig: {
      switch: 1,
      openingType: 0,
      duration: 0,
      outPorts: [{ outletNo: 1, opening: 0 }]
    }
  }
}

function syncOpenFields() {
  const info = paramInfo.value
  if (!info?.timerConfig) return
  const date0 = info.timerConfig.dates?.[0] || getNowDateStr()
  const time = info.timerConfig.time || getNowTimeStr()
  openDateTime.value = `${date0} ${time}`
  openTimeOnly.value = time
}

function onOpenDateTimeChange(val) {
  if (!val || !paramInfo.value) return
  const [date, time] = val.split(' ')
  paramInfo.value.timerConfig.time = time || '00:00:00'
  if (!Array.isArray(paramInfo.value.timerConfig.dates)) {
    paramInfo.value.timerConfig.dates = []
  }
  if (paramInfo.value.timerConfig.dates.length <= 0) {
    paramInfo.value.timerConfig.dates.push(date)
  } else {
    paramInfo.value.timerConfig.dates[0] = date
  }
}

function onOpenTimeOnlyChange(val) {
  if (!paramInfo.value) return
  paramInfo.value.timerConfig.time = val || '00:00:00'
}

function onPickDuration() {
  durationPickerRef.value?.open(
    paramInfo.value?.actionConfig?.duration || 0,
    (total) => {
      if (paramInfo.value) paramInfo.value.actionConfig.duration = total
    }
  )
}

function onPickInterval() {
  durationPickerRef.value?.open(
    paramInfo.value?.timerConfig?.interval || 0,
    (total) => {
      if (paramInfo.value) paramInfo.value.timerConfig.interval = total
    },
    { maxHours: 23 }
  )
}

function startGtEnd(startDate, endDate) {
  const s = new Date(startDate).getTime()
  const e = new Date(endDate).getTime()
  return s > e
}

async function onSave() {
  const info = paramInfo.value
  if (!info) return

  // 对齐移动端设备定时：出水口至少选一个（移动端默认 outletNo:1）
  if (
    props.from === 'device' &&
    (!Array.isArray(info.actionConfig?.outPorts) ||
      info.actionConfig.outPorts.length === 0)
  ) {
    ElMessage.warning('请选择出水口')
    return
  }

  if ((info.actionConfig?.duration || 0) <= 0) {
    ElMessage.warning('请设置打开时长')
    return
  }

  const rt = info.timerConfig.repeatType
  if (rt !== 0) {
    if (rt === 1) {
      if ((info.timerConfig.interval || 0) <= 0) {
        ElMessage.warning('请设置重复周期')
        return
      }
      if (startGtEnd(info.timerConfig.startDate, info.timerConfig.endDate)) {
        ElMessage.warning('开始日期不能大于结束日期')
        return
      }
    }
    if (rt === 2) {
      if (!info.timerConfig.weekDays?.length) {
        ElMessage.warning('周重复需要至少选择一个')
        return
      }
      if (startGtEnd(info.timerConfig.startDate, info.timerConfig.endDate)) {
        ElMessage.warning('开始日期不能大于结束日期')
        return
      }
    }
    if (rt === 3) {
      if (!info.timerConfig.dates?.length) {
        ElMessage.warning('自定义日期不能为空')
        return
      }
    }
  }

  saving.value = true
  try {
    if (props.type === 'add') {
      await addTimePro(info, { silent: true })
    } else {
      await updateTimePro(info, { silent: true })
    }
    ElMessage.success('操作成功')
    emit('saved')
    onVisibleChange(false)
  } catch (e) {
    console.error('[TimerProEditDialog] 保存失败', e)
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  const id = paramInfo.value?.id
  if (id == null) return
  try {
    await ElMessageBox.confirm('请确认是否删除任务？', '删除任务', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      appendTo: 'body'
    })
  } catch {
    return
  }

  deleting.value = true
  try {
    await deleteTimePro(id, { silent: true })
    ElMessage.success('操作成功')
    emit('saved')
    onVisibleChange(false)
  } catch (e) {
    console.error('[TimerProEditDialog] 删除失败', e)
    ElMessage.error(e?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

function onOpened() {
  if (props.from === 'device') {
    buildArrayPort()
  } else {
    arrayPort.value = []
  }

  if (props.type === 'edit' && farmStore.s_pro_info) {
    paramInfo.value = JSON.parse(JSON.stringify(farmStore.s_pro_info))
  } else {
    paramInfo.value = createDefaultParam()
  }
  if (paramInfo.value) {
    paramInfo.value.targetType = props.targetType
    if (props.targetId != null) paramInfo.value.targetId = props.targetId
    if (!paramInfo.value.farmId) paramInfo.value.farmId = getFarmId()
    if (!paramInfo.value.actionConfig) {
      paramInfo.value.actionConfig = {
        switch: 1,
        openingType: 0,
        duration: 0,
        outPorts: []
      }
    }
    if (!Array.isArray(paramInfo.value.actionConfig.outPorts)) {
      paramInfo.value.actionConfig.outPorts = []
    }
  }
  syncOpenFields()
  void props.event
}
</script>

<style scoped>
.timer-pro-edit {
  --timer-control-h: 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 280px;
  padding: 4px 0 8px;
}

.timer-pro-edit__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timer-pro-edit__section-label {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.4;
}

.timer-pro-edit__ports {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.timer-pro-edit__repeat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.timer-pro-edit__choice {
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

.timer-pro-edit__choice .iconfont {
  font-size: 18px;
  color: #c0c4cc;
  line-height: 1;
}

.timer-pro-edit__choice.is-active {
  border-color: #3653a0;
  color: #3653a0;
  font-weight: 600;
  background: rgba(54, 83, 160, 0.04);
}

.timer-pro-edit__choice.is-active .iconfont {
  color: #3653a0;
}

.timer-pro-edit__duo {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.timer-pro-edit__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.timer-pro-edit__control {
  width: 100%;
}

.timer-pro-edit__control.is-full,
.timer-pro-edit__picker.is-full {
  width: 100%;
}

.timer-pro-edit__picker {
  width: 100%;
  height: var(--timer-control-h);
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
}

.timer-pro-edit__picker .iconfont {
  color: #909399;
  font-size: 16px;
  flex-shrink: 0;
}

.timer-pro-edit__range {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f1f5f9;
  box-sizing: border-box;
}

.timer-pro-edit__range-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: #3653a0;
}

.timer-pro-edit__range-sep {
  color: #909399;
  font-size: 13px;
  flex-shrink: 0;
}

.timer-pro-edit__range-picker {
  flex: 1;
  min-width: 0;
}

.timer-pro-edit__weeks {
  padding: 4px 0;
}

.timer-pro-edit__footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: 100%;
}

.timer-pro-edit__delete {
  width: 100%;
  height: 48px;
  margin: 0 !important;
  border-radius: 12px;
}

.timer-pro-edit__save {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: #274082;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(39, 64, 130, 0.28);
}

.timer-pro-edit__save:hover:not(:disabled) {
  background: #1f3468;
}

.timer-pro-edit__save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>

<style>
.timer-pro-edit-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.timer-pro-edit-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
  padding-bottom: 8px;
}

.timer-pro-edit-dialog__title {
  font-size: 20px;
  font-weight: bold;
  color: #1a3b87;
  line-height: 1.2;
}

.timer-pro-edit-dialog .el-dialog__footer {
  padding-top: 8px;
  padding-bottom: 20px;
}

.timer-pro-edit-dialog .timer-pro-edit__control.el-date-editor,
.timer-pro-edit-dialog .timer-pro-edit__control.el-time-editor,
.timer-pro-edit-dialog .timer-pro-edit__range-picker.el-date-editor {
  width: 100% !important;
  box-sizing: border-box;
}

/*
 * 高度走父级 CSS 变量（会转 rem），避免 .el- 选择器被 pxtorem 跳过。
 * 边框与打开时长按钮统一为真实 border，避免 inset box-shadow 造成 1~2px 视觉差。
 */
.timer-pro-edit-dialog .timer-pro-edit__control.el-date-editor,
.timer-pro-edit-dialog .timer-pro-edit__control.el-time-editor {
  height: var(--timer-control-h);
  line-height: var(--timer-control-h);
}

.timer-pro-edit-dialog .timer-pro-edit__control .el-input__wrapper {
  height: 100%;
  min-height: 100%;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: none !important;
  box-sizing: border-box;
}

.timer-pro-edit-dialog .timer-pro-edit__control .el-input__wrapper.is-focus {
  border-color: #3653a0;
}

.timer-pro-edit-dialog .timer-pro-edit__range-picker .el-input__wrapper {
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.timer-pro-edit-dialog .timer-pro-edit__range .el-input__wrapper {
  background: transparent;
  box-shadow: none;
}
</style>
