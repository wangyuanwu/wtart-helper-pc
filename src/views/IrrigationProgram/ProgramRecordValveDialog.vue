<template>
  <el-dialog
    :model-value="modelValue"
    title="阀门执行明细"
    width="600px"
    append-to-body
    destroy-on-close
    align-center
    :close-on-click-modal="false"
    class="program-record-valve-dialog"
    @update:model-value="onVisibleChange"
    @opened="loadDetail"
  >
    <div v-loading="loading" class="prv">
      <div v-if="!loading && !recordList.length" class="prv__empty">暂无记录</div>
      <div v-else class="prv__list">
        <article
          v-for="(item, index) in displayList"
          :key="item.id || index"
          class="prv__item"
        >
          <div v-if="item._showDate" class="prv__date">
            {{ formatDay(item.endTime || item.startTime) }}
          </div>
          <div class="prv__card">
            <div class="prv__card-head">
              <div class="prv__name-row">
                <span class="prv__name">{{ item.name || '--' }}</span>
                <span v-if="item.valvePlace" class="prv__port">
                  ({{ valvePlaceText(item.valvePlace) }})
                </span>
              </div>
              <span
                v-if="[9, 0].includes(Number(item.status))"
                class="prv__status"
                :class="statusClass(item.status)"
              >
                {{ statusText(item.status) }}
              </span>
            </div>

            <div v-if="Number(item.status) === 6" class="prv__fail-row">
              <i class="iconfont icon-device_ic_add_gantanhao"></i>
              <span>打开失败</span>
            </div>
            <div v-else class="prv__metrics">
              <div class="prv__metric">
                <div class="prv__metric-value is-time">
                  {{ formatClock(item.startTime) }}
                </div>
                <div class="prv__metric-label">开始时间</div>
              </div>
              <div class="prv__metric">
                <div class="prv__metric-value is-flow">
                  {{ formatVolume(item.volume) }}<em>m³</em>
                </div>
                <div class="prv__metric-label">灌溉量</div>
              </div>
              <div class="prv__metric is-end">
                <div class="prv__metric-value is-duration">
                  {{ formatDuration(item.duration) }}
                </div>
                <div class="prv__metric-label">灌溉时长</div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
/**
 * 阀门执行明细
 * 对齐移动端 pop_group_record_detail.vue
 */
import { computed, ref } from 'vue'
import { getProgramRecordValveExecution } from '@/api/irrigationProgram'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  stepId: { type: [String, Number], default: null }
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const recordList = ref([])

const portList = [
  { value: '关闭', type: 0 },
  { value: 'A口', type: 1 },
  { value: 'B口', type: 2 },
  { value: 'C口', type: 3 },
  { value: 'D口', type: 4 },
  { value: 'AB口', type: 5 },
  { value: 'AC口', type: 6 },
  { value: 'BD口', type: 7 },
  { value: 'BC口', type: 8 }
]

const displayList = computed(() => {
  const list = recordList.value || []
  const seen = new Set()
  return list.map((item) => {
    const dayKey = dayKeyOf(item.endTime || item.startTime)
    const _showDate = dayKey && !seen.has(dayKey)
    if (dayKey) seen.add(dayKey)
    return { ...item, _showDate }
  })
})

function onVisibleChange(v) {
  emit('update:modelValue', v)
  if (!v) recordList.value = []
}

async function loadDetail() {
  if (props.stepId == null) {
    recordList.value = []
    return
  }
  loading.value = true
  try {
    const res = await getProgramRecordValveExecution(props.stepId)
    recordList.value = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('[ProgramRecordValveDialog] 加载失败', e)
    recordList.value = []
  } finally {
    loading.value = false
  }
}

function valvePlaceText(type) {
  const item = portList.find((p) => p.type === Number(type))
  return item ? item.value : '--'
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

function formatDay(dateStr) {
  return dayKeyOf(dateStr) || '--'
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
    2: '已暂停',
    3: '已完成',
    4: '已取消',
    5: '已完成',
    6: '执行失败',
    9: '异常'
  }
  return map[status] || '未知'
}

function statusClass(status) {
  if (status === 3 || status === 5) return 'is-success'
  if (status === 6 || status === 9 || status === 0) return 'is-fail'
  return 'is-muted'
}
</script>

<style scoped>
.prv {
  min-height: 200px;
  max-height: 60vh;
  overflow: auto;
}

.prv__empty {
  padding: 48px 16px;
  text-align: center;
  color: #909399;
}

.prv__item {
  margin-bottom: 12px;
}

.prv__date {
  margin: 0 0 8px 4px;
  font-size: 13px;
  color: #64748b;
}

.prv__card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #edf1f7;
}

.prv__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prv__name-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.prv__name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.prv__port {
  font-size: 13px;
  color: #3653a0;
  font-weight: 600;
}

.prv__status {
  font-size: 12px;
  font-weight: 600;
}

.prv__status.is-success {
  color: #12b97e;
}

.prv__status.is-fail {
  color: #f56c6c;
}

.prv__status.is-muted {
  color: #909399;
}

.prv__fail-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e6a23c;
  font-size: 13px;
}

.prv__metrics {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.prv__metric.is-end {
  text-align: right;
}

.prv__metric-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.prv__metric-value em {
  margin-left: 2px;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
}

.prv__metric-value.is-time {
  color: #53a3fd;
}

.prv__metric-value.is-flow {
  color: #65ddb9;
}

.prv__metric-value.is-duration {
  color: #fea23f;
}

.prv__metric-label {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
