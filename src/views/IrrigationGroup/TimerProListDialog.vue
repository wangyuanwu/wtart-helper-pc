<template>
  <el-dialog
    :model-value="modelValue"
    title="定时列表"
    width="720px"
    append-to-body
    destroy-on-close
    draggable
    overflow
    :close-on-click-modal="false"
    class="timer-pro-list-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <div v-loading="loading" class="timer-pro-list">
      <template v-if="proList.length">
        <div class="timer-pro-list__scroll">
          <article
            v-for="(item, index) in proList"
            :key="item.id || index"
            class="timer-pro-card"
            @click="onDetail(item)"
          >
            <div class="timer-pro-card__head">
              <span class="timer-pro-card__time">{{ item.timerConfig?.time || '--' }}</span>
              <el-switch
                :model-value="!!item.enabled"
                @click.stop
                @change="(val) => onEnableChange(item, val)"
              />
            </div>

            <div class="timer-pro-card__row">
              <i
                class="iconfont"
                :class="
                  item.timerConfig?.repeatType === 0
                    ? 'icon-device_ic_timing'
                    : 'icon-device_ic_run_01'
                "
              ></i>
              <span v-if="item.timerConfig?.repeatType === 0">
                日期:{{ item.timerConfig?.dates?.[0] || '--' }}
              </span>
              <span v-else-if="item.timerConfig?.repeatType === 1">
                每{{ second2Time(item.timerConfig?.interval) }}
              </span>
              <span v-else-if="item.timerConfig?.repeatType === 2">
                {{ getWeekStr(item) }}
              </span>
              <span v-else-if="item.timerConfig?.repeatType === 3">
                {{ getDateStr(item) }}
              </span>
            </div>

            <div
              v-if="[1, 2].includes(item.timerConfig?.repeatType)"
              class="timer-pro-card__row"
            >
              <i class="iconfont icon-device_ic_timing"></i>
              <span>
                日期:{{ item.timerConfig?.startDate || '--' }} ～
                {{ item.timerConfig?.endDate || '--' }}
              </span>
            </div>

            <div class="timer-pro-card__row">
              <i class="iconfont icon-device_ic_hourglass"></i>
              <span>
                打开时长:{{ second2Time(item.actionConfig?.duration) }}
              </span>
            </div>

            <div
              v-if="item.nextRunTime && item.enabled"
              class="timer-pro-card__row"
            >
              <i class="iconfont icon-device_ic_hourglass"></i>
              <span>下次启动时间:{{ formatUtc(item.nextRunTime) }}</span>
            </div>
          </article>
        </div>

        <button type="button" class="timer-pro-list__fab" @click="onAdd">
          <i class="iconfont icon-jiahao"></i>
        </button>
      </template>

      <div v-else-if="!loading" class="timer-pro-list__empty">
        <img
          class="timer-pro-list__empty-img"
          :src="emptyTimingImg"
          alt=""
        />
        <p class="timer-pro-list__empty-text">无定时，请添加定时</p>
        <button type="button" class="timer-pro-list__empty-btn" @click="onAdd">
          添加定时设置
        </button>
      </div>
    </div>

    <TimerProEditDialog
      v-model="editVisible"
      :from="from"
      :type="editType"
      :event="editEvent"
      :target-id="resolveTargetId()"
      :target-type="targetType"
      @saved="onEditSaved"
    />
  </el-dialog>
</template>

<script setup>
/**
 * 定时列表弹窗
 * 对齐移动端 pages/home/activity/base/time_pro/pro_list?from=group|device
 */
import { computed, h, ref } from 'vue'
import { ElMessage, ElMessageBox, ElRadio, ElRadioGroup } from 'element-plus'
import {
  enableTimePro,
  getTimeProList,
  stopDvTask
} from '@/api/deviceTask'
import { useFarmStore } from '@/store/farm'
import { second2Time } from '@/utils/programTime'
import TimerProEditDialog from './TimerProEditDialog.vue'
import emptyTimingImg from '@/assets/irrigation-group/device_img_timing.png'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** device | group */
  from: { type: String, default: 'group' },
  targetId: { type: [Number, String], default: null }
})

const emit = defineEmits(['update:modelValue'])

const farmStore = useFarmStore()

const WEEK_MAP = {
  0: '周天',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六'
}

const loading = ref(false)
const proList = ref([])
const controlTask = ref(null)
const controlItem = ref(null)
const editVisible = ref(false)
const editType = ref('add')
const editEvent = ref('')

const targetType = computed(() => (props.from === 'group' ? 1 : 0))

function resolveTargetId() {
  if (props.targetId != null && props.targetId !== '') return props.targetId
  if (props.from === 'group') {
    return (
      farmStore.s_group_detail_info?.id ||
      farmStore.s_group_list_item?.id ||
      null
    )
  }
  // from=device：对齐移动端 vuex_control_device_info
  return farmStore.s_control_device?.id || null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatUtc(utcStr) {
  if (!utcStr) return '--'
  const d = new Date(utcStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function getWeekStr(data) {
  const days = data?.timerConfig?.weekDays
  if (!Array.isArray(days) || !days.length) return '--'
  return days.map((item) => WEEK_MAP[item] ?? item).join('、')
}

function getDateStr(data) {
  const dates = data?.timerConfig?.dates
  if (!Array.isArray(dates) || !dates.length) return '--'
  return dates.join('、')
}

async function fetchList() {
  const id = resolveTargetId()
  if (id == null) {
    ElMessage.warning('缺少目标信息')
    return
  }
  loading.value = true
  try {
    const res = await getTimeProList({
      targetType: targetType.value,
      targetId: id
    })
    proList.value = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('[TimerProListDialog] 获取定时列表失败', e)
    proList.value = []
  } finally {
    loading.value = false
  }
}

async function onEnableChange(item, check) {
  controlTask.value = item
  controlItem.value = item
  try {
    await enableTimePro(
      { id: item.id, enabled: check },
      { silent: true }
    )
    ElMessage.success('操作成功')
    await fetchList()
  } catch (e) {
    const code = e?.code
    if (code === 40106) {
      await openStopChoiceDialog()
    } else if (code === 40001) {
      await openSetTimeTip()
    } else {
      item.enabled = !check
      if (e?.message) ElMessage.error(e.message)
    }
  }
}

async function openStopChoiceDialog() {
  const choice = ref(0)
  try {
    await ElMessageBox({
      title: '提示',
      message: () =>
        h('div', { class: 'timer-stop-dialog' }, [
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
      appendTo: 'body'
    })
    await stopDvTaskHttp({
      id: controlTask.value?.id,
      cancelRepeat: choice.value === 1
    })
  } catch {
    await fetchList()
  }
}

async function stopDvTaskHttp(order) {
  if (order?.id == null) return
  try {
    await stopDvTask(order, { silent: true })
    ElMessage.success('操作成功')
    await fetchList()
  } catch (e) {
    console.error('[TimerProListDialog] 停止任务失败', e)
    await fetchList()
  }
}

async function openSetTimeTip() {
  try {
    await ElMessageBox.confirm('开始执行时间必须大于当前时间。', '提示', {
      confirmButtonText: '去设置',
      cancelButtonText: '取消',
      type: 'warning',
      appendTo: 'body'
    })
    openEdit('edit', 'setTime', controlItem.value)
  } catch {
    if (controlItem.value) {
      controlItem.value.enabled = !controlItem.value.enabled
    }
  }
}

function openEdit(type, event = '', item = null) {
  if (item) farmStore.setProInfo(item)
  else farmStore.setProInfo(null)
  editType.value = type
  editEvent.value = event
  editVisible.value = true
}

function onDetail(item) {
  if (!item?.id) return
  openEdit('edit', '', item)
}

function onAdd() {
  openEdit('add', '', null)
}

function onEditSaved() {
  fetchList()
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

function onOpened() {
  proList.value = []
  fetchList()
}
</script>

<style scoped>
.timer-pro-list {
  position: relative;
  min-height: 420px;
  display: flex;
  flex-direction: column;
}

.timer-pro-list__scroll {
  flex: 1;
  max-height: 520px;
  overflow-y: auto;
  padding: 4px 4px 72px;
  box-sizing: border-box;
}

.timer-pro-card {
  margin-bottom: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #edf1f7;
  cursor: pointer;
  box-sizing: border-box;
}

.timer-pro-card:hover {
  border-color: #c5d0ea;
}

.timer-pro-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f7;
}

.timer-pro-card__time {
  font-size: 28px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1.2;
}

.timer-pro-card__row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 14px;
  color: #303133;
}

.timer-pro-card__row .iconfont {
  flex-shrink: 0;
  font-size: 16px;
  color: #3653a0;
  line-height: 1;
}

.timer-pro-list__fab {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: #3653a0;
  color: #fff;
  box-shadow: 0 6px 16px rgba(54, 83, 160, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.timer-pro-list__fab .iconfont {
  font-size: 22px;
  line-height: 1;
}

.timer-pro-list__fab:hover {
  background: #2f4a90;
}

.timer-pro-list__empty {
  flex: 1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px 40px;
  box-sizing: border-box;
}

.timer-pro-list__empty-img {
  width: 210px;
  height: auto;
  object-fit: contain;
  display: block;
  margin-bottom: 20px;
  user-select: none;
  pointer-events: none;
}

.timer-pro-list__empty-text {
  margin: 0 0 28px;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.timer-pro-list__empty-btn {
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

.timer-pro-list__empty-btn:hover {
  background: #2f4a90;
}
</style>

<style>
.timer-pro-list-dialog .el-dialog__body {
  padding-top: 8px;
}

.timer-pro-list-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
}
</style>
