<template>
  <el-dialog
    :model-value="modelValue"
    title="一键均压"
    width="720px"
    append-to-body
    destroy-on-close
    draggable
    overflow
    :close-on-click-modal="false"
    class="ave-press-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
    @closed="onClosed"
  >
    <div v-loading="loading && !portInfo" class="ave-press">
      <template v-if="portInfo">
        <div
          class="ave-press__status"
          :class="statusClass"
        >
          <i class="iconfont icon-group_ic_noti_01"></i>
          <span>{{ statusText }}</span>
        </div>

        <div class="ave-press__list">
          <article
            v-for="(item, index) in portList"
            :key="item.id || item.outletNo || index"
            class="ave-press__item"
          >
            <div class="ave-press__item-head">
              <span class="ave-press__item-name">
                出水口{{ item.outletName || '--' }}
              </span>
              <span class="ave-press__item-open">
                已打开{{ formatOpening(item.currentOpening) }}%
              </span>
            </div>
            <div class="ave-press__bar">
              <div
                class="ave-press__bar-fill"
                :style="{ width: `${clampOpening(item.currentOpening)}%` }"
              ></div>
              <span class="ave-press__bar-label">
                水压{{ formatPressure(item.pressure) }}千帕
              </span>
            </div>
          </article>

          <div v-if="!portList.length" class="ave-press__empty">
            暂无出水口数据
          </div>
        </div>

        <div class="ave-press__tip">
          <p>均压结束后，各出水口的默认开度将</p>
          <p>调整到均压结束下的开度</p>
        </div>
      </template>
    </div>

    <template v-if="portInfo && !isBalancing" #footer>
      <div class="ave-press__footer">
        <el-button
          type="primary"
          class="ave-press__start-btn"
          :loading="starting"
          @click="onStartBalance"
        >
          开始均压
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 一键均压弹窗
 * 对齐移动端 pages/home/activity/group/group_ave_press
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { balancePressure, getBalancePress } from '@/api/irrigationGroup'
import { useFarmStore } from '@/store/farm'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  groupId: { type: [Number, String], default: null }
})

const emit = defineEmits(['update:modelValue'])

const farmStore = useFarmStore()

const BALANCE_STATUS = ['未均压', '均压中', '均压完成', '均压失败']
const POLL_MS = 3000

const loading = ref(false)
const starting = ref(false)
const portInfo = ref(null)
const portList = ref([])

let pollTimer = null

const balanceStatus = computed(() => Number(portInfo.value?.balanceStatus) || 0)

const isBalancing = computed(() => balanceStatus.value === 1)

const statusText = computed(
  () => BALANCE_STATUS[balanceStatus.value] ?? '未均压'
)

const statusClass = computed(() => {
  const map = {
    0: 'is-idle',
    1: 'is-running',
    2: 'is-success',
    3: 'is-fail'
  }
  return map[balanceStatus.value] || 'is-idle'
})

function resolveGroupId() {
  if (props.groupId != null && props.groupId !== '') return props.groupId
  return (
    farmStore.s_group_list_item?.id ||
    farmStore.s_group_detail_info?.id ||
    null
  )
}

function clampOpening(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

function formatOpening(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
}

function formatPressure(val) {
  if (val == null || val === '') return '--'
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function normalizePortList(data) {
  const list = Array.isArray(data?.outletPiles) ? data.outletPiles : []
  // 兼容：若返回的是出水桩结构（含 ports），展平为出水口列表
  if (list.length && list[0]?.outletName == null && Array.isArray(list[0]?.ports)) {
    const ports = []
    list.forEach((pile) => {
      ;(pile.ports || pile.waterOutletPile?.ports || []).forEach((p) => {
        ports.push(p)
      })
    })
    return ports
  }
  if (
    list.length &&
    list[0]?.outletName == null &&
    Array.isArray(list[0]?.waterOutletPile?.ports)
  ) {
    const ports = []
    list.forEach((pile) => {
      ;(pile.waterOutletPile?.ports || []).forEach((p) => ports.push(p))
    })
    return ports
  }
  return list
}

async function fetchStatus({ showLoading = false } = {}) {
  const id = resolveGroupId()
  if (id == null) {
    if (showLoading) ElMessage.warning('缺少轮灌组信息')
    return
  }
  if (showLoading) loading.value = true
  try {
    const res = await getBalancePress(id, {
      silent: !showLoading,
      loading: false
    })
    portInfo.value = res?.data || null
    portList.value = normalizePortList(res?.data)
  } catch (e) {
    console.error('[AvePressDialog] 获取均压状态失败', e)
    if (showLoading) {
      portInfo.value = null
      portList.value = []
    }
  } finally {
    if (showLoading) loading.value = false
  }
}

async function onStartBalance() {
  const id = resolveGroupId()
  if (id == null || starting.value) return
  starting.value = true
  try {
    await balancePressure({ groupId: id }, { silent: true })
    ElMessage.success('操作成功')
    await fetchStatus({ showLoading: false })
  } catch (e) {
    console.error('[AvePressDialog] 开始均压失败', e)
    ElMessage.error(e?.message || '操作失败')
  } finally {
    starting.value = false
  }
}

function startPoll() {
  clearPoll()
  pollTimer = setInterval(() => {
    fetchStatus({ showLoading: false })
  }, POLL_MS)
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

async function onOpened() {
  portInfo.value = null
  portList.value = []
  await fetchStatus({ showLoading: true })
  startPoll()
}

function onClosed() {
  clearPoll()
  portInfo.value = null
  portList.value = []
  starting.value = false
}
</script>

<style scoped>
.ave-press {
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.ave-press__status {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 6px 14px;
  border-radius: 20px;
  background: #eef1f6;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.ave-press__status .iconfont {
  font-size: 16px;
  line-height: 1;
}

.ave-press__status.is-idle {
  color: #3653a0;
}

.ave-press__status.is-running {
  color: #e6a23c;
}

.ave-press__status.is-success {
  color: #39b54a;
}

.ave-press__status.is-fail {
  color: #f53f3f;
}

.ave-press__list {
  flex: 1;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.ave-press__item {
  padding: 16px 0;
  border-bottom: 1px solid #edf1f7;
}

.ave-press__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.ave-press__item-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.ave-press__item-open {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f5f7fa;
  color: #606266;
  font-size: 12px;
}

.ave-press__bar {
  position: relative;
  width: 100%;
  height: 28px;
  border-radius: 14px;
  background: rgba(99, 153, 237, 0.25);
  overflow: hidden;
}

.ave-press__bar-fill {
  height: 100%;
  background: #6399ed;
  border-radius: 0 14px 14px 0;
  transition: width 0.3s ease;
}

.ave-press__bar-label {
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.ave-press__empty {
  padding: 48px 16px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.ave-press__tip {
  margin-top: 24px;
  text-align: center;
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}

.ave-press__tip p {
  margin: 0;
}

.ave-press__footer {
  display: flex;
  justify-content: center;
  width: 100%;
}

.ave-press__start-btn {
  min-width: 220px;
  height: 42px;
  border-radius: 10px;
  background: #3653a0;
  border-color: #3653a0;
  font-weight: 600;
}
</style>

<style>
.ave-press-dialog .el-dialog__body {
  padding-top: 8px;
}

.ave-press-dialog .el-dialog__header {
  cursor: move;
  user-select: none;
}
</style>
