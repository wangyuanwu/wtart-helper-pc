<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="640px"
    append-to-body
    destroy-on-close
    draggable
    overflow
    :close-on-click-modal="false"
    class="timer-pro-edit-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <div v-if="paramInfo" class="timer-pro-edit">
      <!-- 设备：出水口选择（对齐移动端 edit_pro from=device） -->
      <div v-if="from === 'device'" class="timer-pro-edit__row">
        <span class="timer-pro-edit__label">出水口选择</span>
        <div class="timer-pro-edit__ports">
          <button
            v-for="port in arrayPort"
            :key="port.value"
            type="button"
            class="timer-pro-edit__port"
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

      <!-- 不重复：打开日期时间 -->
      <div
        v-if="paramInfo.timerConfig.repeatType === 0"
        class="timer-pro-edit__row"
      >
        <span class="timer-pro-edit__label">打开时间</span>
        <el-date-picker
          v-model="openDateTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          format="YYYY-MM-DD HH:mm"
          placeholder="选择打开时间"
          class="timer-pro-edit__control"
          @change="onOpenDateTimeChange"
        />
      </div>

      <!-- 重复：仅时刻 -->
      <div v-else class="timer-pro-edit__row">
        <span class="timer-pro-edit__label">打开时间</span>
        <el-time-picker
          v-model="openTimeOnly"
          value-format="HH:mm:ss"
          format="HH:mm"
          placeholder="选择打开时间"
          class="timer-pro-edit__control"
          @change="onOpenTimeOnlyChange"
        />
      </div>

      <div class="timer-pro-edit__row">
        <span class="timer-pro-edit__label">打开时长</span>
        <button type="button" class="timer-pro-edit__picker" @click="onPickDuration">
          <span>{{ second2Time(paramInfo.actionConfig.duration) }}</span>
          <i class="iconfont icon-device_ic_timing"></i>
        </button>
      </div>

      <div class="timer-pro-edit__block">
        <div class="timer-pro-edit__row is-top">
          <span class="timer-pro-edit__label">是否重复</span>
          <el-radio-group v-model="paramInfo.timerConfig.repeatType">
            <el-radio :value="0">不重复</el-radio>
            <el-radio :value="1">间隔重复</el-radio>
            <el-radio :value="2">周重复</el-radio>
            <el-radio :value="3">定义日期</el-radio>
          </el-radio-group>
        </div>
      </div>

      <div
        v-if="paramInfo.timerConfig.repeatType === 1"
        class="timer-pro-edit__row"
      >
        <span class="timer-pro-edit__label">重复周期</span>
        <button type="button" class="timer-pro-edit__picker" @click="onPickInterval">
          <span>{{ second2Time(paramInfo.timerConfig.interval) }}</span>
          <i class="iconfont icon-device_ic_timing"></i>
        </button>
      </div>

      <div
        v-if="[1, 2].includes(paramInfo.timerConfig.repeatType)"
        class="timer-pro-edit__range"
      >
        <el-date-picker
          v-model="paramInfo.timerConfig.startDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
        />
        <span class="timer-pro-edit__range-sep">至</span>
        <el-date-picker
          v-model="paramInfo.timerConfig.endDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
        />
      </div>

      <div
        v-if="paramInfo.timerConfig.repeatType === 2"
        class="timer-pro-edit__weeks"
      >
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

      <div
        v-if="paramInfo.timerConfig.repeatType === 3"
        class="timer-pro-edit__row"
      >
        <span class="timer-pro-edit__label">自定义日期</span>
        <el-date-picker
          v-model="paramInfo.timerConfig.dates"
          type="dates"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          class="timer-pro-edit__control"
        />
      </div>
    </div>

    <template #footer>
      <div class="timer-pro-edit__footer">
        <el-button
          v-if="type !== 'add'"
          type="danger"
          plain
          :loading="deleting"
          @click="onDelete"
        >
          删除
        </el-button>
        <div class="timer-pro-edit__footer-spacer"></div>
        <el-button @click="onVisibleChange(false)">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">
          保存
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
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addTimePro, deleteTimePro, updateTimePro } from '@/api/deviceTask'
import { useFarmStore } from '@/store/farm'
import { getNowDateStr, getNowTimeStr, second2Time } from '@/utils/programTime'
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

const dialogTitle = computed(() =>
  props.type === 'add' ? '添加定时' : '定时设置'
)

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
      outPorts:
        props.from === 'device'
          ? []
          : [{ outletNo: 1, opening: 0 }]
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
    }
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 280px;
}

.timer-pro-edit__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf1f7;
}

.timer-pro-edit__row.is-top {
  align-items: flex-start;
}

.timer-pro-edit__label {
  width: 88px;
  flex-shrink: 0;
  font-size: 14px;
  color: #303133;
  line-height: 32px;
}

.timer-pro-edit__control {
  flex: 1;
  min-width: 0;
}

.timer-pro-edit__ports {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.timer-pro-edit__port {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
}

.timer-pro-edit__port .iconfont {
  font-size: 18px;
  color: #c0c4cc;
  line-height: 1;
}

.timer-pro-edit__port.is-active {
  color: #3653a0;
  font-weight: 600;
}

.timer-pro-edit__port.is-active .iconfont {
  color: #3653a0;
}

.timer-pro-edit__picker {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
}

.timer-pro-edit__picker .iconfont {
  color: #909399;
  font-size: 16px;
}

.timer-pro-edit__block {
  margin-top: 8px;
  padding-top: 4px;
}

.timer-pro-edit__range {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin: 8px 0;
  border-radius: 8px;
  background: #f5f7fa;
}

.timer-pro-edit__range-sep {
  color: #909399;
  font-size: 13px;
  flex-shrink: 0;
}

.timer-pro-edit__weeks {
  padding: 12px 0;
}

.timer-pro-edit__footer {
  display: flex;
  align-items: center;
  width: 100%;
}

.timer-pro-edit__footer-spacer {
  flex: 1;
}
</style>

<style>
.timer-pro-edit-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
}
</style>
