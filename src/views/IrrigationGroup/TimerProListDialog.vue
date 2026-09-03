<template>
  <el-dialog
    :model-value="modelValue"
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
    <template #header>
      <div class="timer-pro-list-dialog__title">定时</div>
    </template>

    <div v-loading="loading" class="timer-pro-list">
      <div v-if="!proList.length && !loading" class="timer-pro-list__empty">
        <img
          class="timer-pro-list__empty-img"
          :src="emptyTimingImg"
          alt=""
        />
        <p class="timer-pro-list__empty-text">无定时，请添加定时</p>
      </div>

      <div v-else-if="proList.length" class="timer-pro-list__grid">
        <article
          v-for="(item, index) in proList"
          :key="item.id || index"
          class="timer-pro-card"
          @click="onDetail(item)"
        >
          <div class="timer-pro-card__head">
            <span class="timer-pro-card__time">
              {{ formatTimeDisplay(item.timerConfig?.time) }}
            </span>
            <el-switch
              :model-value="!!item.enabled"
              @click.stop
              @change="(val) => onEnableChange(item, val)"
            />
          </div>

          <div class="timer-pro-card__outlet">
            {{ getOutletLabel(item) }}
          </div>

          <div class="timer-pro-card__details">
            <!-- 重复规则 / 单次日期 -->
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

            <!-- 有重复规则时展示日期区间（对齐设计稿红框） -->
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
            <div v-else class="timer-pro-card__row is-placeholder" aria-hidden="true"></div>

            <div class="timer-pro-card__row">
              <i class="iconfont icon-device_ic_hourglass"></i>
              <span>
                打开时长:{{ second2Time(item.actionConfig?.duration) }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>

    <template #footer>
      <button type="button" class="timer-pro-list__add-btn" @click="onAdd">
        添加定时设置
      </button>
    </template>

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

function formatTimeDisplay(timeStr) {
  if (!timeStr) return '--'
  const parts = String(timeStr).split(':')
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
  return timeStr
}

/** 出水口展示；暂无数据时留空占位 */
function getOutletLabel(item) {
  const ports = item?.actionConfig?.outPorts
  if (!Array.isArray(ports) || !ports.length) return ''
  const outletNo = Number(ports[0]?.outletNo)
  if (!outletNo) return ''
  const outletName = ports[0]?.outletName
  if (outletName) return outletName
  const letter = String.fromCharCode(64 + outletNo)
  return `${letter}出水口`
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
    const code = Number(e?.code)
    // 对齐移动端：40106 → 停止任务选择；其它业务错误 →「去设置」
    if (code === 40106) {
      await openStopChoiceDialog()
    } else {
      await openSetTimeTip(e?.message || '开始执行时间必须大于当前时间。')
    }
  }
}

async function openStopChoiceDialog() {
  const choice = ref(null)
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
      appendTo: 'body',
      beforeClose: (action, instance, done) => {
        if (action === 'confirm' && choice.value == null) {
          ElMessage.warning('请选择操作项')
          return
        }
        done()
      }
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

async function openSetTimeTip(message) {
  try {
    await ElMessageBox.confirm(
      message || '开始执行时间必须大于当前时间。',
      '提示',
      {
        confirmButtonText: '去设置',
        cancelButtonText: '取消',
        type: 'warning',
        appendTo: 'body'
      }
    )
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
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.timer-pro-list__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  padding: 4px 0 8px;
  max-height: 480px;
  overflow-y: auto;
  box-sizing: border-box;
}

.timer-pro-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #edf1f7;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
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
  gap: 8px;
}

.timer-pro-card__time {
  font-size: 24px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1.2;
}

.timer-pro-card__outlet {
  min-height: 20px;
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 20px;
}

.timer-pro-card__details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  /* 统一为 3 行详情高度（重复规则 + 日期 + 打开时长） */
  min-height: calc(3 * 20px + 2 * 8px);
}

.timer-pro-card__row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  font-size: 13px;
  color: #606266;
  line-height: 20px;
}

.timer-pro-card__row.is-placeholder {
  visibility: hidden;
  pointer-events: none;
}

.timer-pro-card__row .iconfont {
  flex-shrink: 0;
  font-size: 15px;
  color: #3653a0;
  line-height: 1;
}

.timer-pro-list__empty {
  flex: 1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 24px 8px;
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
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.timer-pro-list__add-btn {
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

.timer-pro-list__add-btn:hover {
  background: #2f4a90;
}

@media (max-width: 680px) {
  .timer-pro-list__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<style>
.timer-pro-list-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.timer-pro-list-dialog .el-dialog__body {
  padding-top: 8px;
}

.timer-pro-list-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
  padding-bottom: 8px;
}

.timer-pro-list-dialog__title {
  font-size: 20px;
  font-weight: bold;
  color: #1a3b87;
  line-height: 1.2;
}

.timer-pro-list-dialog .el-dialog__footer {
  display: flex;
  justify-content: center;
  padding-top: 8px;
  padding-bottom: 20px;
}
</style>
