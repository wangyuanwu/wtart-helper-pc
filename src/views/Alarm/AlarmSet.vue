<template>
  <div class="alarm-set-page">
    <div class="alarm-set-page__head">
      <div class="alarm-set-page__head-left">
        <button type="button" class="alarm-set-page__back" @click="onBack">
          ← 返回
        </button>
        <h1 class="alarm-set-page__title">预警设置</h1>
      </div>
    </div>

    <div
      v-if="pageTip"
      class="alarm-set-page__tip"
      :class="`is-${pageTip.type}`"
    >
      <span>{{ pageTip.message }}</span>
      <button type="button" class="alarm-set-page__tip-close" @click="clearPageTip">
        ×
      </button>
    </div>

    <div v-loading="loading" class="alarm-set-page__body">
      <!-- 设备丢失报警 -->
      <section class="alarm-set-card">
        <div class="alarm-set-card__head">
          <span class="alarm-set-card__title">出水桩设备丢失报警</span>
          <el-switch
            v-model="alarmSet.settings[0].enabled"
            @change="(val) => onEnableChange(0, val)"
          />
        </div>
        <div class="alarm-set-card__row">
          <span class="alarm-set-card__label">偏移距离</span>
          <div class="alarm-set-card__input-wrap">
            <input
              v-model="alarmSet.settings[0].minValue"
              class="alarm-set-card__input"
              type="number"
              placeholder="请输入距离"
            />
            <span class="alarm-set-card__unit">米</span>
          </div>
        </div>
        <p class="alarm-set-card__remark">
          备注:设备离开立桩指定的报警距离后，系统将报警提示。
        </p>
        <div class="alarm-set-card__phone">
          <span class="alarm-set-card__phone-label">
            电话通知
            <el-tooltip
              content="当设备偏移原来位置将收到语言电话通知。"
              placement="top"
            >
              <i class="iconfont icon-device_ic_add_gantanhao alarm-set-card__help"></i>
            </el-tooltip>
          </span>
          <el-switch v-model="alarmSet.settings[0].phoneNotify" />
        </div>
      </section>

      <!-- 低水压报警 -->
      <section class="alarm-set-card">
        <div class="alarm-set-card__head">
          <span class="alarm-set-card__title">出水桩低水压报警</span>
          <el-switch
            v-model="alarmSet.settings[1].enabled"
            @change="(val) => onEnableChange(1, val)"
          />
        </div>
        <div class="alarm-set-card__row">
          <span class="alarm-set-card__label">报警水压：小于</span>
          <div class="alarm-set-card__input-wrap">
            <input
              v-model="alarmSet.settings[1].minValue"
              class="alarm-set-card__input"
              type="number"
              placeholder="请输入水压"
            />
            <span class="alarm-set-card__unit">bar(公斤)</span>
          </div>
        </div>
        <div class="alarm-set-card__row">
          <span class="alarm-set-card__label">
            启动时报警延时
            <el-tooltip
              content="阀门刚启动时，水压较低，系统将延迟此设置时间后。水压仍低于设定水压系统将报警。"
              placement="top"
            >
              <i class="iconfont icon-device_ic_add_gantanhao alarm-set-card__help"></i>
            </el-tooltip>
          </span>
          <div class="alarm-set-card__input-wrap">
            <input
              v-model="delayMin"
              class="alarm-set-card__input"
              type="number"
              placeholder="请输入延时"
            />
            <span class="alarm-set-card__unit">min</span>
          </div>
        </div>
        <p class="alarm-set-card__remark">
          备注:阀门启动后超过报警延迟时间，水压仍低于设定水压或灌溉过程中水压低于设定水压，系统将报警提示。
        </p>
        <div class="alarm-set-card__phone">
          <span class="alarm-set-card__phone-label">电话通知</span>
          <el-switch v-model="alarmSet.settings[1].phoneNotify" />
        </div>
      </section>

      <!-- 低电量报警 -->
      <section class="alarm-set-card">
        <div class="alarm-set-card__head">
          <span class="alarm-set-card__title">出水桩低电量报警</span>
          <el-switch
            v-model="alarmSet.settings[2].enabled"
            @change="(val) => onEnableChange(2, val)"
          />
        </div>
        <div class="alarm-set-card__row">
          <span class="alarm-set-card__label">电量低于</span>
          <div class="alarm-set-card__input-wrap">
            <input
              v-model="alarmSet.settings[2].minValue"
              class="alarm-set-card__input"
              type="number"
              placeholder="请输入电量"
            />
            <span class="alarm-set-card__unit">%</span>
          </div>
        </div>
        <p class="alarm-set-card__remark">
          备注:当出水桩电量低于设置电量报警，系统将报警提示。
        </p>
        <div class="alarm-set-card__phone">
          <span class="alarm-set-card__phone-label">电话通知</span>
          <el-switch v-model="alarmSet.settings[2].phoneNotify" />
        </div>
      </section>

      <!-- 仅电话通知类 -->
      <section class="alarm-set-card">
        <div
          v-for="(item, index) in phoneOnlySettings"
          :key="item.alarmType"
          class="alarm-set-card__phone-only"
          :class="{ 'is-last': index === phoneOnlySettings.length - 1 }"
        >
          <span class="alarm-set-card__title">{{ item.label }}</span>
          <el-switch v-model="alarmSet.settings[item.index].phoneNotify" />
        </div>
      </section>

      <!-- 电话通知人 + 通知禁止时间 -->
      <section class="alarm-set-card">
        <div
          class="alarm-set-card__member alarm-set-card__member--clickable"
          @click="openMemberDialog"
        >
          <span class="alarm-set-card__title">电话通知人</span>
          <div class="alarm-set-card__member-right">
            <span class="alarm-set-card__member-name">{{ showMemberName }}</span>
            <i class="iconfont icon-farm_ic_back_01"></i>
          </div>
        </div>

        <div class="alarm-set-card__quiet-head">
          <span class="alarm-set-card__title">
            通知禁止时间
            <el-tooltip
              content="此时间段内发生报警，将不会电话通知。"
              placement="top"
            >
              <i class="iconfont icon-device_ic_add_gantanhao alarm-set-card__help"></i>
            </el-tooltip>
          </span>
          <button type="button" class="alarm-set-card__quiet-add" @click="addQuietSlot">
            <span>添加</span>
            <i class="iconfont icon-device_ic_add"></i>
          </button>
        </div>

        <div
          v-for="(item, index) in alarmSet.quietSlots"
          :key="index"
          class="alarm-set-card__quiet-row"
        >
          <div class="alarm-set-card__quiet-col">
            <span class="alarm-set-card__quiet-sub">开始时间</span>
            <el-time-picker
              v-model="item.start"
              format="HH:mm"
              value-format="HH:mm:ss"
              placeholder="开始时间"
              class="alarm-set-card__time-picker"
            />
          </div>
          <div class="alarm-set-card__quiet-col">
            <div class="alarm-set-card__quiet-sub-row">
              <span class="alarm-set-card__quiet-sub">结束时间</span>
              <button
                type="button"
                class="alarm-set-card__quiet-del"
                @click="removeQuietSlot(index)"
              >
                <i class="iconfont icon-shanchu"></i>
              </button>
            </div>
            <div class="alarm-set-card__quiet-end">
              <el-time-picker
                v-model="item.end"
                format="HH:mm"
                value-format="HH:mm:ss"
                placeholder="结束时间"
                class="alarm-set-card__time-picker"
              />
              <span
                v-if="isQuietSlotCrossDay(item)"
                class="alarm-set-card__quiet-plus"
              >+1</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 免费短信 / 电话余额 -->
      <section class="alarm-set-card">
        <div class="alarm-set-card__balance">
          <span class="alarm-set-card__title">免费短信通知剩余</span>
          <div class="alarm-set-card__balance-right">
            <span class="alarm-set-card__balance-num">{{ alarmSet.smsBalance ?? 0 }}条</span>
            <button type="button" class="alarm-set-card__recharge" @click="onRecharge">
              立即充值
            </button>
          </div>
        </div>
        <div class="alarm-set-card__balance is-last">
          <span class="alarm-set-card__title">免费电话通知剩余</span>
          <div class="alarm-set-card__balance-right">
            <span class="alarm-set-card__balance-num">{{ alarmSet.voiceBalance ?? 0 }}条</span>
            <button type="button" class="alarm-set-card__recharge" @click="onRecharge">
              立即充值
            </button>
          </div>
        </div>
      </section>
    </div>

    <div class="alarm-set-page__footer">
      <el-button
        type="primary"
        class="alarm-set-page__save"
        :loading="saving"
        @click="onSave"
      >
        保存
      </el-button>
    </div>

    <el-dialog
      v-model="memberDialogVisible"
      title="成员选择"
      width="520px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      class="alarm-member-dialog"
    >
      <div class="alarm-member-list">
        <label
          v-for="item in memberDialogList"
          :key="item.id"
          class="alarm-member-item"
        >
          <el-checkbox v-model="item.isChose" />
          <img
            class="alarm-member-item__avatar"
            :src="item.avatarUrl || defaultAvatar"
            alt=""
          />
          <div class="alarm-member-item__info">
            <div class="alarm-member-item__name">
              {{ item.nickName || '暂无昵称' }}
              <span class="alarm-member-item__role">
                ——{{ getIdentityByRoleId(item.roleId) }}
              </span>
            </div>
            <div class="alarm-member-item__phone">{{ item.phoneNumber || '--' }}</div>
          </div>
        </label>
        <div v-if="!memberDialogList.length" class="alarm-member-empty">
          暂无农场成员
        </div>
      </div>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMemberSelect">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 预警设置
 * 对齐移动端 pages/home/activity/alarm/alarm_set
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { alarmSetting, getAlarmSetList } from '@/api/alarm'
import { getMemberList } from '@/api/farm'
import { useFarmStore } from '@/store/farm'
import { time2Second } from '@/utils/programTime'
import defaultAvatar from '@/assets/my_img_01.svg'

const router = useRouter()
const farmStore = useFarmStore()

const phoneOnlySettings = [
  { index: 3, alarmType: 4, label: '设备离线电话通知' },
  { index: 4, alarmType: 5, label: '设备关机电话通知' },
  { index: 5, alarmType: 6, label: '任务执行失败电话通知' },
  { index: 6, alarmType: 7, label: '阀门堵转电话通知' },
  { index: 7, alarmType: 8, label: '设备太阳能板被遮挡电话通知' }
]

function createDefaultSettings() {
  return [
    {
      alarmType: 1,
      enabled: true,
      phoneNotify: true,
      minValue: 0.3,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    },
    {
      alarmType: 2,
      enabled: true,
      phoneNotify: true,
      minValue: 1000,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    },
    {
      alarmType: 3,
      enabled: true,
      phoneNotify: true,
      minValue: 30,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    },
    {
      alarmType: 4,
      enabled: true,
      phoneNotify: true,
      minValue: 0,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    },
    {
      alarmType: 5,
      enabled: true,
      phoneNotify: true,
      minValue: 0,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    },
    {
      alarmType: 6,
      enabled: true,
      phoneNotify: true,
      minValue: 0,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    },
    {
      alarmType: 7,
      enabled: true,
      phoneNotify: true,
      minValue: 0,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    },
    {
      alarmType: 8,
      enabled: true,
      phoneNotify: true,
      minValue: 0,
      maxValue: 0,
      delaySeconds: 0,
      remark: 'string'
    }
  ]
}

const loading = ref(false)
const saving = ref(false)
const delayMin = ref(20)
const memberIdList = ref([])
const memberList = ref([])
const memberDialogList = ref([])
const memberDialogVisible = ref(false)
const pageTip = ref(null)
let tipTimer = null
let offFarmChange = null

const alarmSet = reactive({
  farmId: 0,
  notifyFarmUserIds: [],
  quietSlots: [],
  smsBalance: 0,
  voiceBalance: 0,
  settings: createDefaultSettings()
})

const getFarmId = () =>
  farmStore.selectFarm?.id ?? farmStore.s_selectFarm?.id ?? null

const showMemberName = computed(() => {
  if (!memberIdList.value.length) return '未选择'
  const nameArr = memberList.value
    .filter((item) => memberIdList.value.includes(item.id))
    .map((item) => item.nickName || item.phoneNumber || '--')
  return nameArr.length ? nameArr.join('、') : '未选择'
})

function getIdentityByRoleId(roleId) {
  if (Number(roleId) === 10) return '农场主'
  return '农场成员'
}

function clearPageTip() {
  if (tipTimer) {
    clearTimeout(tipTimer)
    tipTimer = null
  }
  pageTip.value = null
}

function showPageTip(message, type = 'error', duration = 5000) {
  clearPageTip()
  pageTip.value = { message, type }
  if (duration > 0) {
    tipTimer = setTimeout(() => {
      pageTip.value = null
      tipTimer = null
    }, duration)
  }
}

/** 对齐移动端：关闭主开关时同步关闭电话通知 */
function onEnableChange(index, enabled) {
  if (!enabled && alarmSet.settings[index]) {
    alarmSet.settings[index].phoneNotify = false
  }
}

function normalizeTimeValue(val) {
  if (!val) return '00:00:00'
  const parts = String(val).split(':')
  if (parts.length >= 3) return val
  if (parts.length === 2) return `${val}:00`
  return '00:00:00'
}

/** 对齐移动端 isForbidTimeError：开始 > 结束则跨天显示 +1 */
function isQuietSlotCrossDay(item) {
  if (!item) return false
  return time2Second(item.start) > time2Second(item.end)
}

function addQuietSlot() {
  if (!Array.isArray(alarmSet.quietSlots)) {
    alarmSet.quietSlots = []
  }
  alarmSet.quietSlots.push({
    start: '00:00:00',
    end: '05:00:00'
  })
}

function removeQuietSlot(index) {
  if (!Array.isArray(alarmSet.quietSlots)) return
  if (index < 0 || index >= alarmSet.quietSlots.length) return
  alarmSet.quietSlots.splice(index, 1)
}

function onRecharge() {
  ElMessageBox.alert('请前往移动端进行充值', '提示', {
    confirmButtonText: '知道了',
    type: 'info'
  }).catch(() => {})
}

function ensureSettingsLength() {
  const defaults = createDefaultSettings()
  if (!Array.isArray(alarmSet.settings) || alarmSet.settings.length < 8) {
    alarmSet.settings = defaults
    return
  }
  // 按 alarmType 对齐，缺失则补默认
  const byType = new Map(
    alarmSet.settings.map((s) => [Number(s.alarmType), s])
  )
  alarmSet.settings = defaults.map((def) => {
    const cur = byType.get(def.alarmType)
    return cur ? { ...def, ...cur } : { ...def }
  })
}

async function fetchAlarmSet() {
  const farmId = getFarmId()
  if (farmId == null) {
    showPageTip('请先选择农场', 'info')
    alarmSet.quietSlots = []
    alarmSet.smsBalance = 0
    alarmSet.voiceBalance = 0
    return
  }
  alarmSet.farmId = farmId
  loading.value = true
  try {
    const res = await getAlarmSetList({ farmId }, { silent: true })
    if (res?.data?.settings) {
      alarmSet.settings = JSON.parse(JSON.stringify(res.data.settings))
      ensureSettingsLength()
      const delay = Number(alarmSet.settings[1]?.delaySeconds) || 0
      delayMin.value = Math.floor(delay / 60)
      if (Array.isArray(res.data.notifyFarmUser)) {
        memberIdList.value = res.data.notifyFarmUser.map((item) => item.id)
      } else {
        memberIdList.value = []
      }
      alarmSet.quietSlots = Array.isArray(res.data.quietSlots)
        ? res.data.quietSlots.map((slot) => ({
            start: normalizeTimeValue(slot?.start),
            end: normalizeTimeValue(slot?.end)
          }))
        : []
      alarmSet.smsBalance = Number(res.data.smsBalance) || 0
      alarmSet.voiceBalance = Number(res.data.voiceBalance) || 0
    }
  } catch (e) {
    console.error('[AlarmSet] 获取设置失败', e)
    showPageTip(e?.message || '获取告警设置失败', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchMembers() {
  const farmId = getFarmId()
  if (farmId == null) return
  try {
    const res = await getMemberList({ farmId }, { silent: true })
    memberList.value = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('[AlarmSet] 获取成员失败', e)
    memberList.value = []
  }
}

function openMemberDialog() {
  memberDialogList.value = memberList.value.map((item) => ({
    ...item,
    isChose: memberIdList.value.includes(item.id)
  }))
  memberDialogVisible.value = true
}

function confirmMemberSelect() {
  memberIdList.value = memberDialogList.value
    .filter((item) => item.isChose)
    .map((item) => item.id)
  memberDialogVisible.value = false
}

async function onSave() {
  const farmId = getFarmId()
  if (farmId == null) {
    showPageTip('请先选择农场', 'info')
    return
  }
  ensureSettingsLength()
  alarmSet.farmId = farmId
  alarmSet.settings[1].delaySeconds = (Number(delayMin.value) || 0) * 60
  alarmSet.notifyFarmUserIds = [...memberIdList.value]

  // 输入框绑定可能是字符串，提交前转数字（对齐接口数值字段）
  alarmSet.settings.forEach((s) => {
    if (s.minValue != null && s.minValue !== '') s.minValue = Number(s.minValue)
    if (s.maxValue != null && s.maxValue !== '') s.maxValue = Number(s.maxValue)
    if (s.delaySeconds != null) s.delaySeconds = Number(s.delaySeconds) || 0
  })

  const quietSlots = (Array.isArray(alarmSet.quietSlots) ? alarmSet.quietSlots : []).map(
    (slot) => ({
      start: normalizeTimeValue(slot?.start),
      end: normalizeTimeValue(slot?.end)
    })
  )

  saving.value = true
  try {
    await alarmSetting(
      {
        farmId: alarmSet.farmId,
        notifyFarmUserIds: alarmSet.notifyFarmUserIds,
        quietSlots,
        settings: alarmSet.settings
      },
      { silent: true }
    )
    ElMessage.success('操作成功')
  } catch (e) {
    console.error('[AlarmSet] 保存失败', e)
    showPageTip(e?.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/alarm')
}

async function bootstrap() {
  await Promise.all([fetchAlarmSet(), fetchMembers()])
}

onMounted(() => {
  bootstrap()
  offFarmChange = farmStore.onFarmChange(() => {
    memberIdList.value = []
    bootstrap()
  })
})

onUnmounted(() => {
  offFarmChange?.()
  clearPageTip()
})

watch(
  () => getFarmId(),
  (id, prev) => {
    if (id != null && String(id) !== String(prev)) {
      memberIdList.value = []
      bootstrap()
    }
  }
)
</script>

<style scoped>
.alarm-set-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
  box-sizing: border-box;
}

.alarm-set-page__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
}

.alarm-set-page__head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.alarm-set-page__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.alarm-set-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.alarm-set-page__tip {
  flex-shrink: 0;
  margin: 0 20px 12px;
  padding: 10px 14px;
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.alarm-set-page__tip.is-error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

.alarm-set-page__tip.is-success {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.alarm-set-page__tip.is-info {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}

.alarm-set-page__tip-close {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
}

.alarm-set-page__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.alarm-set-card {
  padding: 16px 18px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
}

.alarm-set-card__member {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f7;
}

.alarm-set-card__member--clickable {
  cursor: pointer;
}

.alarm-set-card__member--clickable:hover {
  opacity: 0.9;
}

.alarm-set-card__member-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.alarm-set-card__member-name {
  font-size: 14px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 360px;
}

.alarm-set-card__member-right .iconfont {
  font-size: 14px;
  color: #c0c4cc;
}

.alarm-set-card__quiet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.alarm-set-card__quiet-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.alarm-set-card__quiet-add .iconfont {
  font-size: 16px;
  line-height: 1;
}

.alarm-set-card__quiet-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.alarm-set-card__quiet-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alarm-set-card__quiet-sub {
  font-size: 12px;
  color: #909399;
}

.alarm-set-card__quiet-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.alarm-set-card__quiet-del {
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.alarm-set-card__quiet-del:hover {
  color: #909399;
}

.alarm-set-card__quiet-del .iconfont {
  font-size: 16px;
}

.alarm-set-card__quiet-end {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alarm-set-card__time-picker {
  width: 100%;
}

.alarm-set-card__quiet-plus {
  flex-shrink: 0;
  color: #3653a0;
  font-size: 13px;
  font-weight: 700;
}

.alarm-set-card__balance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf1f7;
}

.alarm-set-card__balance:first-child {
  padding-top: 0;
}

.alarm-set-card__balance.is-last {
  border-bottom: none;
  padding-bottom: 0;
}

.alarm-set-card__balance-right {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.alarm-set-card__balance-num {
  font-size: 14px;
  color: #303133;
}

.alarm-set-card__recharge {
  height: 28px;
  padding: 0 12px;
  border: 1px solid #3653a0;
  border-radius: 6px;
  background: #fff;
  color: #3653a0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.alarm-set-card__recharge:hover {
  background: rgba(54, 83, 160, 0.06);
}

.alarm-set-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f7;
}

.alarm-set-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.alarm-set-card__row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.alarm-set-card__label {
  width: 140px;
  flex-shrink: 0;
  font-size: 14px;
  color: #303133;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.alarm-set-card__input-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.alarm-set-card__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.alarm-set-card__unit {
  flex-shrink: 0;
  font-size: 13px;
  color: #909399;
}

.alarm-set-card__remark {
  margin: 10px 0 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.alarm-set-card__phone {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #edf1f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.alarm-set-card__phone-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.alarm-set-card__help {
  font-size: 16px;
  color: #c0c4cc;
  cursor: help;
  line-height: 1;
}

.alarm-set-card__phone-only {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf1f7;
}

.alarm-set-card__phone-only.is-last {
  border-bottom: none;
  padding-bottom: 0;
}

.alarm-set-card__phone-only:first-child {
  padding-top: 0;
}

.alarm-set-page__footer {
  flex-shrink: 0;
  padding: 12px 20px 20px;
  background: #f7fafc;
  display: flex;
  justify-content: center;
}

.alarm-set-page__save {
  min-width: 240px;
  height: 42px;
  border-radius: 10px;
  background: #3653a0;
  border-color: #3653a0;
  font-weight: 600;
}

.alarm-member-list {
  max-height: 420px;
  overflow-y: auto;
}

.alarm-member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid #edf1f7;
  cursor: pointer;
}

.alarm-member-item:last-child {
  border-bottom: none;
}

.alarm-member-item__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #f5f7fa;
  flex-shrink: 0;
}

.alarm-member-item__info {
  flex: 1;
  min-width: 0;
}

.alarm-member-item__name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.alarm-member-item__role {
  font-weight: 400;
  color: #909399;
  font-size: 13px;
}

.alarm-member-item__phone {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  color: #3653a0;
}

.alarm-member-empty {
  padding: 32px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}
</style>
