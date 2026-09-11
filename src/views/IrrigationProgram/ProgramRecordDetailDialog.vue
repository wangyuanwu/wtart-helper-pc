<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="640px"
    append-to-body
    destroy-on-close
    align-center
    :close-on-click-modal="false"
    class="program-record-detail-dialog"
    @update:model-value="onVisibleChange"
    @opened="loadDetail"
  >
    <div v-loading="loading" class="prd">
      <div v-if="!loading && !stepList.length" class="prd__empty">暂无记录</div>
      <div v-else class="prd__list">
        <section
          v-for="group in dayGroups"
          :key="group.dayKey"
          class="prd__day"
        >
          <div class="prd__date">{{ group.dayKey }}</div>
          <el-timeline class="prd__timeline">
            <el-timeline-item
              v-for="(item, index) in group.items"
              :key="item.id || `${group.dayKey}-${index}`"
              hollow
              color="#53A3FD"
              size="large"
              hide-timestamp
            >
              <article
                class="prd__card"
                :class="{ 'is-clickable': Number(item.stepType) === 0 }"
                @click="onStepClick(item)"
              >
                <div class="prd__card-head">
                  <div class="prd__name-row">
                    <span class="prd__name">{{ item.name || '--' }}</span>
                    <i
                      v-if="item.hasFail && item.status !== 4"
                      class="iconfont icon-device_ic_add_gantanhao prd__warn"
                    ></i>
                  </div>
                  <span
                    v-if="showStatusText(item)"
                    class="prd__status"
                    :class="statusClass(item.status)"
                  >
                    {{ statusText(item.status) }}
                  </span>
                </div>

                <div
                  v-if="Number(item.status) === 4 && !(item.startTime && item.endTime)"
                  class="prd__fail-row"
                >
                  <i class="iconfont icon-device_ic_add_gantanhao"></i>
                  <span>{{ statusText(item.status) }}</span>
                </div>
                <div v-else class="prd__metrics">
                  <div class="prd__metric">
                    <div class="prd__metric-value is-time">
                      {{ formatClock(item.startTime) }}
                    </div>
                    <div class="prd__metric-label">开始时间</div>
                  </div>
                  <div class="prd__metric-divider" aria-hidden="true"></div>
                  <div class="prd__metric is-center">
                    <div class="prd__metric-value is-flow">
                      {{ formatVolume(item.volume) }}<em>m³</em>
                    </div>
                    <div class="prd__metric-label">灌溉量</div>
                  </div>
                  <div class="prd__metric-divider" aria-hidden="true"></div>
                  <div class="prd__metric is-end">
                    <div class="prd__metric-value is-duration">
                      {{ formatDuration(item.durationSeconds) }}
                    </div>
                    <div class="prd__metric-label">灌溉时长</div>
                  </div>
                </div>
                <div v-if="Number(item.stepType) === 0" class="prd__tip">
                  点击查看阀门执行明细
                </div>
              </article>
            </el-timeline-item>
          </el-timeline>
        </section>
      </div>
    </div>

    <ProgramRecordValveDialog v-model="valveVisible" :step-id="valveStepId" />
  </el-dialog>
</template>

<script setup>
/**
 * 运行记录步骤详情
 * 对齐移动端 pro_record_deatil.vue（程序记录，非 isGroup）
 * 时间轴使用 Element Plus Timeline
 */
import { computed, ref } from 'vue'
import { getProgramRecordDetail } from '@/api/irrigationProgram'
import ProgramRecordValveDialog from './ProgramRecordValveDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recordId: { type: [String, Number], default: null },
  title: { type: String, default: '记录详情' }
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const stepList = ref([])
const valveVisible = ref(false)
const valveStepId = ref(null)

const dayGroups = computed(() => {
  const list = stepList.value || []
  const groups = []
  let current = null
  for (const item of list) {
    const dayKey = dayKeyOf(item.startTime) || '--'
    if (!current || current.dayKey !== dayKey) {
      current = { dayKey, items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }
  return groups
})

function onVisibleChange(v) {
  emit('update:modelValue', v)
  if (!v) {
    stepList.value = []
    valveVisible.value = false
    valveStepId.value = null
  }
}

async function loadDetail() {
  if (props.recordId == null) {
    stepList.value = []
    return
  }
  loading.value = true
  try {
    const res = await getProgramRecordDetail(props.recordId)
    stepList.value = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('[ProgramRecordDetailDialog] 加载失败', e)
    stepList.value = []
  } finally {
    loading.value = false
  }
}

function onStepClick(item) {
  if (Number(item?.stepType) !== 0 || item?.id == null) return
  valveStepId.value = item.id
  valveVisible.value = true
}

function dayKeyOf(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatClock(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '--'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatVolume(v) {
  if (v == null || v === '') return '0.0'
  return Number(v).toFixed(1)
}

function formatDuration(seconds) {
  if (seconds == null || seconds === '') return '--'
  let secondTime = parseInt(seconds, 10)
  if (!Number.isFinite(secondTime)) return '--'
  let minuteTime = 0
  let hourTime = 0
  if (secondTime >= 60) {
    minuteTime = Math.floor(secondTime / 60)
    secondTime %= 60
    if (minuteTime >= 60) {
      hourTime = Math.floor(minuteTime / 60)
      minuteTime %= 60
    }
  }
  if (hourTime > 0 && minuteTime > 0) return `${hourTime}h${minuteTime}m`
  if (hourTime > 0) return `${hourTime}h`
  return `${minuteTime}m`
}

function statusText(status) {
  const map = {
    0: '未执行',
    1: '运行中',
    2: '已完成',
    3: '已跳过',
    4: '执行失败'
  }
  return map[status] || '未知'
}

function statusClass(status) {
  if (status === 2) return 'is-success'
  if (status === 4 || status === 0) return 'is-fail'
  return 'is-muted'
}

function showStatusText(item) {
  return (
    Number(item.status) === 0 &&
    !(item.startTime != null && item.endTime != null)
  )
}
</script>

<style scoped>
.prd {
  min-height: 220px;
  max-height: 62vh;
  overflow: auto;
  padding: 4px 4px 8px;
  box-sizing: border-box;
}

.prd__empty {
  padding: 48px 16px;
  text-align: center;
  color: #909399;
}

.prd__day + .prd__day {
  margin-top: 8px;
}

.prd__date {
  margin: 0 0 10px 2px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.prd__timeline {
  padding-left: 2px;
  margin: 0;
}

.prd__timeline :deep(.el-timeline-item__wrapper) {
  padding-left: 24px;
  top: 0;
}

.prd__timeline :deep(.el-timeline-item__tail) {
  border-left: 2px dashed #53a3fd;
  left: 6px;
}

.prd__timeline :deep(.el-timeline-item__node--large) {
  left: -1px;
  width: 14px;
  height: 14px;
  background-color: #fff !important;
  border-color: #53a3fd !important;
}

.prd__timeline :deep(.el-timeline-item__node.is-hollow) {
  background-color: #fff !important;
  border-width: 3px;
}

.prd__timeline :deep(.el-timeline-item:last-child .el-timeline-item__tail) {
  display: none;
}

.prd__timeline :deep(.el-timeline-item) {
  padding-bottom: 16px;
}

.prd__card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}

.prd__card.is-clickable {
  cursor: pointer;
}

.prd__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prd__name-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.prd__name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.prd__warn {
  color: #e6a23c;
  font-size: 14px;
}

.prd__status {
  font-size: 12px;
  font-weight: 600;
}

.prd__status.is-success {
  color: #12b97e;
}

.prd__status.is-fail {
  color: #f56c6c;
}

.prd__status.is-muted {
  color: #909399;
}

.prd__fail-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e6a23c;
  font-size: 13px;
}

.prd__metrics {
  margin-top: 12px;
  display: flex;
  align-items: stretch;
  gap: 0;
}

.prd__metric {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.prd__metric.is-center {
  align-items: center;
}

.prd__metric.is-end {
  align-items: flex-end;
}

.prd__metric-divider {
  width: 1px;
  align-self: center;
  height: 36px;
  background: #e5e7eb;
  flex-shrink: 0;
  margin: 0 8px;
}

.prd__metric-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.prd__metric-value em {
  margin-left: 2px;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
}

.prd__metric-value.is-time {
  color: #53a3fd;
}

.prd__metric-value.is-flow {
  color: #65ddb9;
}

.prd__metric-value.is-duration {
  color: #fea23f;
}

.prd__metric-label {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.prd__tip {
  margin-top: 10px;
  font-size: 12px;
  color: #3653a0;
}
</style>

<style>
.program-record-detail-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.program-record-detail-dialog .el-dialog__body {
  background: #f5f7fa;
  padding-top: 12px;
}
</style>
