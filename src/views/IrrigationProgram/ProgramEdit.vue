<template>
  <div class="program-edit-page">
    <header class="program-edit-page__header">
      <div class="program-edit-page__head-left">
        <button type="button" class="program-edit-page__back" @click="onCancel">
          ← 返回
        </button>
        <h1 class="program-edit-page__title">{{ pageTitle }}</h1>
      </div>
      <div class="program-edit-page__actions">
        <button type="button" class="program-edit-page__btn is-plain" @click="onCancel">
          取消
        </button>
        <button
          v-if="pageType === 'edit'"
          type="button"
          class="program-edit-page__btn is-danger"
          :disabled="saving || deleting"
          @click="onDelete"
        >
          {{ deleting ? '删除中...' : '删除' }}
        </button>
        <button
          type="button"
          class="program-edit-page__btn is-primary"
          :disabled="saving || deleting"
          @click="onSave"
        >
          {{ saving ? '保存中...' : '保存程序' }}
        </button>
      </div>
    </header>

    <div v-if="pageLoading" class="program-edit-page__loading">加载中...</div>

    <div v-else-if="proInfo" class="program-edit-page__body">
      <div class="program-edit-page__main">
        <!-- 基础信息 -->
        <section class="program-card">
          <div class="program-card__head">
            <span class="program-card__icon-wrap">
              <img class="program-card__icon" :src="iconBasic" alt="" />
            </span>
            <h2 class="program-card__title">基础信息</h2>
          </div>
          <div class="program-card__body">
            <div class="program-field">
              <label class="program-field__label">程序名称</label>
              <input
                ref="nameInputRef"
                v-model="proInfo.name"
                class="program-field__input"
                type="text"
                placeholder="请输入程序名称"
                maxlength="50"
              />
            </div>
            <div class="program-field">
              <label class="program-field__label">选择地块</label>
              <el-select
                v-model="proInfo.landId"
                class="program-field__select"
                placeholder="请选择地块"
                @change="onLandChange"
              >
                <el-option
                  v-for="land in landList"
                  :key="land.id"
                  :label="land.name"
                  :value="land.id"
                />
              </el-select>
            </div>
            <div class="program-field program-field--clickable" @click="openGroupChose">
              <label class="program-field__label">选择轮灌组</label>
              <div class="program-field__value">
                <span :class="{ 'is-placeholder': !groupNameText }">
                  {{ groupNameText || '请选择轮灌组' }}
                </span>
                <span class="program-field__chevron">›</span>
              </div>
            </div>
            <div class="program-switch-row">
              <div class="program-switch-row__text">
                <div class="program-switch-row__title">轮灌组参数相同</div>
                <div class="program-switch-row__desc">
                  所有组将共用相同的灌溉时长和开启角度设置
                </div>
              </div>
              <el-switch v-model="proInfo.isGroupParametersSame" />
            </div>
          </div>
        </section>

        <!-- 轮灌组参数 -->
        <section class="program-card program-card--groups">
          <div class="program-card__head">
            <span class="program-card__icon-wrap">
              <img class="program-card__icon" :src="iconGroups" alt="" />
            </span>
            <h2 class="program-card__title">轮灌组参数</h2>
            <span class="program-card__badge">支持拖拽排序</span>
          </div>
          <div class="program-card__body">
            <div
              v-if="!proInfo.groups.length"
              class="program-groups-empty"
            >
              请先选择轮灌组
            </div>
            <div
              v-for="(item, index) in proInfo.groups"
              :key="item.irrigationGroupId"
              class="program-group-row"
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover.prevent
              @drop="onDrop(index)"
            >
              <span class="program-group-row__drag iconfont icon-device_ic_drag">⋮⋮</span>
              <span class="program-group-row__index">{{ padIndex(index + 1) }}</span>
              <span class="program-group-row__name">
                {{ getGroupDisplayName(item.irrigationGroupId) }}
              </span>
              <button
                type="button"
                class="program-group-row__duration"
                @click="setGroupTime(item)"
              >
                {{ formatDurationFriendly(item.durationSeconds) }}
              </button>
              <button
                type="button"
                class="program-group-row__delete"
                title="移除"
                @click="removeGroup(item.irrigationGroupId)"
              >
                <i class="iconfont icon-land_ic_dele"></i>
              </button>
            </div>
            <button type="button" class="program-add-group-btn" @click="openGroupChose">
              + 添加轮灌组
            </button>
          </div>
        </section>
      </div>

      <aside class="program-edit-page__side">
        <!-- 运行规则 -->
        <section class="program-card">
          <div class="program-card__head">
            <span class="program-card__icon-wrap">
              <img class="program-card__icon" :src="iconRules" alt="" />
            </span>
            <h2 class="program-card__title">运行规则</h2>
          </div>
          <div class="program-card__body">
            <div class="program-field program-field--inline">
              <label class="program-field__label">轮灌次数</label>
              <div class="program-field__number">
                <el-input-number
                  v-model="proInfo.rotationCount"
                  :min="0"
                  :max="999999"
                  controls-position="right"
                />
                <span class="program-field__unit">次</span>
              </div>
            </div>
            <div class="program-field program-field--inline">
              <label class="program-field__label">组间间隔时长</label>
              <button
                type="button"
                class="program-field__duration-btn"
                @click="setIntervalTime"
              >
                <i class="iconfont icon-device_ic_timing"></i>
                {{ intervalText }}
              </button>
            </div>
            <div class="program-switch-row">
              <div class="program-switch-row__text">
                <div class="program-switch-row__title">保持最后一个轮灌组开启</div>
                <div class="program-switch-row__desc">轮灌完毕后，防止爆管</div>
              </div>
              <el-switch v-model="proInfo.keepOneRunning" />
            </div>
          </div>
        </section>

        <!-- 启动条件 -->
        <section class="program-card program-card--start">
          <div class="program-card__head">
            <span class="program-card__icon-wrap">
              <img class="program-card__icon" :src="iconStart" alt="" />
            </span>
            <h2 class="program-card__title">启动条件</h2>
          </div>
          <div class="program-card__body">
            <div class="program-field">
              <label class="program-field__label">启动条件</label>
              <el-select v-model="proInfo.startCondition" class="program-field__select">
                <el-option
                  v-for="(label, idx) in startModeList"
                  :key="idx"
                  :label="label"
                  :value="idx"
                />
              </el-select>
            </div>

            <template v-if="proInfo.startCondition === 1">
              <!-- 开始时间 -->
              <div id="targetTimeItem" class="program-field">
                <label class="program-field__label">开始时间</label>
                <el-date-picker
                  v-if="proInfo.timerTaskConfig.timerConfig.repeatType === 0"
                  v-model="openDateTime"
                  type="datetime"
                  placeholder="选择日期时间"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  class="program-field__picker"
                  @change="onOpenDateTimeChange"
                />
                <el-time-picker
                  v-else
                  v-model="openTimeOnly"
                  placeholder="选择时间"
                  format="HH:mm:ss"
                  value-format="HH:mm:ss"
                  class="program-field__picker"
                  @change="onOpenTimeOnlyChange"
                />
              </div>

              <!-- 禁止时间段 -->
              <div class="program-forbid">
                <div class="program-forbid__head">
                  <span>禁止时间段</span>
                  <button type="button" class="program-forbid__add" @click="addForbidTime">
                    +
                  </button>
                  <el-switch
                    v-model="proInfo.timerTaskConfig.forbidTimeConfig.enabled"
                    class="program-forbid__switch"
                  />
                </div>
                <div
                  v-if="proInfo.timerTaskConfig.forbidTimeConfig.enabled"
                  class="program-forbid__list"
                >
                  <div
                    v-for="(ft, fi) in proInfo.timerTaskConfig.forbidTimeConfig.forbidTimes"
                    :key="fi"
                    class="program-forbid__row"
                  >
                    <div class="program-forbid__col">
                      <span class="program-forbid__sub">开始时间</span>
                      <el-time-picker
                        v-model="ft.startTime"
                        format="HH:mm:ss"
                        value-format="HH:mm:ss"
                        placeholder="开始"
                        class="program-field__picker"
                      />
                    </div>
                    <div class="program-forbid__col">
                      <div class="program-forbid__sub-row">
                        <span class="program-forbid__sub">结束时间</span>
                        <button
                          type="button"
                          class="program-forbid__del"
                          @click="removeForbidTime(ft)"
                        >
                          <i class="iconfont icon-land_ic_dele"></i>
                        </button>
                      </div>
                      <el-time-picker
                        v-model="ft.endTime"
                        format="HH:mm:ss"
                        value-format="HH:mm:ss"
                        placeholder="结束"
                        class="program-field__picker"
                      />
                      <span
                        v-if="isForbidTimeCrossDay(ft)"
                        class="program-forbid__plus-one"
                      >+1</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 是否重复 -->
              <div class="program-field">
                <label class="program-field__label">是否重复</label>
                <el-radio-group v-model="proInfo.timerTaskConfig.timerConfig.repeatType">
                  <el-radio
                    v-for="opt in repeatTypeOptions"
                    :key="opt.value"
                    :label="opt.value"
                  >
                    {{ opt.label }}
                  </el-radio>
                </el-radio-group>
              </div>

              <!-- 间隔重复 -->
              <div
                v-if="proInfo.timerTaskConfig.timerConfig.repeatType === 1"
                class="program-field program-field--inline"
              >
                <label class="program-field__label">重复周期</label>
                <button
                  type="button"
                  class="program-field__duration-btn"
                  @click="setRepeatInterval"
                >
                  <i class="iconfont icon-device_ic_timing"></i>
                  {{ second2Time(proInfo.timerTaskConfig.timerConfig.interval) }}
                </button>
              </div>

              <!-- 日期范围 -->
              <div
                v-if="[1, 2].includes(proInfo.timerTaskConfig.timerConfig.repeatType)"
                class="program-field program-date-range"
              >
                <el-date-picker
                  v-model="proInfo.timerTaskConfig.timerConfig.startDate"
                  type="date"
                  placeholder="开始日期"
                  value-format="YYYY-MM-DD"
                  class="program-field__picker"
                />
                <span class="program-date-range__sep">至</span>
                <el-date-picker
                  v-model="proInfo.timerTaskConfig.timerConfig.endDate"
                  type="date"
                  placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  class="program-field__picker"
                />
              </div>

              <!-- 周重复 -->
              <div
                v-if="proInfo.timerTaskConfig.timerConfig.repeatType === 2"
                class="program-week"
              >
                <el-checkbox-group v-model="proInfo.timerTaskConfig.timerConfig.weekDays">
                  <el-checkbox
                    v-for="w in weekOptions"
                    :key="w.value"
                    :label="w.value"
                  >
                    {{ w.label }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>

              <!-- 自定义日期 -->
              <div
                v-if="proInfo.timerTaskConfig.timerConfig.repeatType === 3"
                class="program-field"
              >
                <label class="program-field__label">自定义日期</label>
                <el-date-picker
                  v-model="proInfo.timerTaskConfig.timerConfig.dates"
                  type="dates"
                  placeholder="选择多个日期"
                  value-format="YYYY-MM-DD"
                  class="program-field__picker program-field__picker--full"
                />
              </div>
            </template>
          </div>
        </section>
      </aside>
    </div>

    <GroupChoseDialog ref="groupChoseRef" @confirm="onGroupChoseConfirm" />
    <DurationPickerDialog ref="durationPickerRef" />
  </div>
</template>

<script setup>
/**
 * 对齐移动端 pages/home/activity/pro/edit_group_pro
 * add / edit 共用布局，edit 走 getProDetail + updateGroupPro + deleteGroupPro
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLandList } from '@/api/map'
import { getGroupListByLandId } from '@/api/irrigationGroup'
import {
  addGroupPro,
  deleteGroupPro,
  getProDetail,
  updateGroupPro
} from '@/api/irrigationProgram'
import { useFarmStore } from '@/store/farm'
import DurationPickerDialog from '@/components/DurationPickerDialog.vue'
import GroupChoseDialog from './GroupChoseDialog.vue'
import iconBasic from '@/assets/irrigation-program/icon-basic.png'
import iconRules from '@/assets/irrigation-program/icon-rules.png'
import iconGroups from '@/assets/irrigation-program/icon-groups.png'
import iconStart from '@/assets/irrigation-program/icon-start.png'
import {
  createDefaultProInfo,
  formatDurationFriendly,
  getDateOffsetStr,
  getNowDateStr,
  getNowTimeStr,
  second2Time,
  time2Second
} from '@/utils/programTime'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const proInfo = ref(null)
const landList = ref([])
const groupChoseList = ref([])
const saving = ref(false)
const deleting = ref(false)
const pageLoading = ref(false)
const nameInputRef = ref(null)
const groupChoseRef = ref(null)
const durationPickerRef = ref(null)
const dragFromIndex = ref(-1)

const openDateTime = ref('')
const openTimeOnly = ref('')

const pageType = computed(() => String(route.query.type || 'add'))
const pageTitle = computed(() =>
  pageType.value === 'add' ? '新建轮灌程序' : '编辑轮灌程序'
)

const startModeList = ['手动启动', '定时']
const repeatTypeOptions = [
  { value: 0, label: '不重复' },
  { value: 1, label: '间隔重复' },
  { value: 2, label: '周重复' },
  { value: 3, label: '定义日期' }
]
const weekOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周天' }
]

const groupNameText = computed(() => {
  if (!proInfo.value?.groups?.length) return ''
  return proInfo.value.groups
    .map((item) => {
      const g = groupChoseList.value.find(
        (x) => String(x.id) === String(item.irrigationGroupId)
      )
      return (g?.name || item.name || '').trim()
    })
    .filter(Boolean)
    .join('、')
})

const intervalText = computed(() => {
  const sec = proInfo.value?.intervalSeconds ?? 0
  return sec > 0 ? formatDurationFriendly(sec) : '例如：5分钟'
})

const getFarmId = () =>
  farmStore.s_selectFarm?.id ??
  farmStore.selectFarm?.id ??
  farmStore.s_farm_info?.id ??
  null

function padIndex(n) {
  return String(n).padStart(2, '0')
}

function getGroupDisplayName(groupId) {
  const g = groupChoseList.value.find((x) => String(x.id) === String(groupId))
  if (g?.name) return g.name
  const fromPro = proInfo.value?.groups?.find(
    (x) => String(x.irrigationGroupId) === String(groupId)
  )
  return fromPro?.name || '未知轮灌组'
}

function ensureTimerTaskConfig() {
  if (!proInfo.value) return
  if (!proInfo.value.timerTaskConfig) {
    const fallback = createDefaultProInfo(getFarmId())
    proInfo.value.timerTaskConfig = JSON.parse(
      JSON.stringify(fallback.timerTaskConfig)
    )
    initOpenTime()
    return
  }
  syncOpenTimeFromDetail()
}

/** 对齐移动端 getProDetailHttp 后 openTime 同步 */
function syncOpenTimeFromDetail() {
  if (!proInfo.value?.timerTaskConfig) return
  const tc = proInfo.value.timerTaskConfig.timerConfig
  if (!tc) return
  let dateStr = ''
  if (Array.isArray(tc.dates) && tc.dates.length > 0) {
    dateStr = tc.dates[0]
  } else {
    dateStr = getNowDateStr()
    tc.dates = [dateStr]
  }
  const timeStr = tc.time || getNowTimeStr()
  tc.time = timeStr
  openDateTime.value = `${dateStr} ${timeStr}`
  openTimeOnly.value = timeStr
}

function scrollToStartTime() {
  nextTick(() => {
    document.getElementById('targetTimeItem')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  })
}

function initOpenTime() {
  if (!proInfo.value) return
  const tc = proInfo.value.timerTaskConfig.timerConfig
  const nowDate = getNowDateStr()
  const nowTime = getNowTimeStr()
  tc.dates = [nowDate]
  tc.time = nowTime
  tc.startDate = nowDate
  tc.endDate = getDateOffsetStr(nowDate, 1)
  openDateTime.value = `${nowDate} ${nowTime}`
  openTimeOnly.value = nowTime
}

function onOpenDateTimeChange(val) {
  if (!val || !proInfo.value) return
  const [date, time] = val.split(' ')
  const tc = proInfo.value.timerTaskConfig.timerConfig
  tc.dates = date ? [date] : []
  tc.time = time || '00:00:00'
}

function onOpenTimeOnlyChange(val) {
  if (!proInfo.value) return
  proInfo.value.timerTaskConfig.timerConfig.time = val || '00:00:00'
}

function isForbidTimeCrossDay(item) {
  return time2Second(item.startTime) > time2Second(item.endTime)
}

async function fetchLandList() {
  const farmId = getFarmId()
  if (farmId == null) return
  try {
    const res = await getLandList({ farmId })
    const list = Array.isArray(res?.data) ? res.data : []
    landList.value = list
    if (pageType.value === 'add' && list.length > 0 && !proInfo.value.landId) {
      proInfo.value.landId = list[0].id
    }
    if (proInfo.value.landId) {
      await fetchGroupList(proInfo.value.landId)
    }
  } catch (e) {
    console.error('[ProgramEdit] 获取地块失败', e)
  }
}

async function fetchGroupList(landId) {
  const farmId = getFarmId()
  if (farmId == null || landId == null) return
  try {
    const res = await getGroupListByLandId({ farmId, landId })
    groupChoseList.value = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('[ProgramEdit] 获取轮灌组失败', e)
    groupChoseList.value = []
  }
}

function onLandChange() {
  proInfo.value.groups = []
  fetchGroupList(proInfo.value.landId)
}

function openGroupChose() {
  const ids = proInfo.value.groups.map((g) => g.irrigationGroupId)
  groupChoseRef.value?.open(groupChoseList.value, ids)
}

/** 对齐移动端 onConform */
function onGroupChoseConfirm(selectIds) {
  proInfo.value.groups = proInfo.value.groups.filter((item) =>
    selectIds.includes(item.irrigationGroupId)
  )
  selectIds.forEach((irrigationGroupId) => {
    const exists = proInfo.value.groups.some(
      (g) => g.irrigationGroupId === irrigationGroupId
    )
    if (!exists) {
      const groupItem = groupChoseList.value.find((g) => g.id === irrigationGroupId)
      proInfo.value.groups.push({
        name: groupItem?.name || '',
        irrigationGroupId,
        groupIndex: proInfo.value.groups.length,
        durationSeconds: 0,
        angleMode: 0
      })
    }
  })
  proInfo.value.groups.forEach((item, index) => {
    item.groupIndex = index
  })
}

function removeGroup(groupId) {
  proInfo.value.groups = proInfo.value.groups.filter(
    (g) => g.irrigationGroupId !== groupId
  )
  proInfo.value.groups.forEach((item, index) => {
    item.groupIndex = index
  })
}

function onDragStart(index) {
  dragFromIndex.value = index
}

function onDrop(toIndex) {
  const from = dragFromIndex.value
  if (from < 0 || from === toIndex || !proInfo.value?.groups?.length) return
  const list = [...proInfo.value.groups]
  const [moved] = list.splice(from, 1)
  list.splice(toIndex, 0, moved)
  list.forEach((item, index) => {
    item.groupIndex = index
  })
  proInfo.value.groups = list
  dragFromIndex.value = -1
}

let editingGroupItem = null

function setGroupTime(item) {
  editingGroupItem = item
  durationPickerRef.value?.open(item.durationSeconds, (total) => {
    if (proInfo.value.isGroupParametersSame) {
      proInfo.value.groups.forEach((g) => {
        g.durationSeconds = total
      })
    } else if (editingGroupItem) {
      editingGroupItem.durationSeconds = total
    }
  })
}

function setIntervalTime() {
  durationPickerRef.value?.open(proInfo.value.intervalSeconds, (total) => {
    proInfo.value.intervalSeconds = total
  })
}

function setRepeatInterval() {
  durationPickerRef.value?.open(
    proInfo.value.timerTaskConfig.timerConfig.interval,
    (total) => {
      proInfo.value.timerTaskConfig.timerConfig.interval = total
    }
  )
}

function addForbidTime() {
  proInfo.value.timerTaskConfig.forbidTimeConfig.forbidTimes.push({
    startTime: '00:00:00',
    endTime: '02:00:00'
  })
}

function removeForbidTime(item) {
  const list = proInfo.value.timerTaskConfig.forbidTimeConfig.forbidTimes
  const idx = list.indexOf(item)
  if (idx !== -1) list.splice(idx, 1)
}

function validateForbidTime() {
  const info = proInfo.value
  if (
    !info?.timerTaskConfig?.forbidTimeConfig?.enabled ||
    !info.timerTaskConfig.forbidTimeConfig.forbidTimes?.length
  ) {
    return true
  }
  const invalid = info.timerTaskConfig.forbidTimeConfig.forbidTimes.some(
    (item) => time2Second(item.startTime) >= time2Second(item.endTime)
  )
  if (invalid) {
    ElMessage.warning('禁止时段，结束时间需大于开始时间')
    return false
  }
  return true
}

function validateBeforeSave() {
  const info = proInfo.value
  if (!info.name?.trim()) {
    ElMessage.warning('请输入程序名称')
    nameInputRef.value?.focus?.()
    return false
  }
  if (info.landId == null) {
    ElMessage.warning('请选择地块')
    return false
  }
  if (!info.groups.length) {
    ElMessage.warning('请选择轮灌组')
    return false
  }
  if (info.groups.some((g) => !g.durationSeconds || g.durationSeconds <= 0)) {
    ElMessage.warning('请设置轮灌组灌溉时长')
    return false
  }
  if (info.timerTaskConfig.timerConfig.repeatType === 1) {
    const startT = new Date(info.timerTaskConfig.timerConfig.startDate).getTime()
    const endT = new Date(info.timerTaskConfig.timerConfig.endDate).getTime()
    if (startT >= endT) {
      ElMessage.warning('开始日期不能大于结束日期')
      return false
    }
  }
  return true
}

async function onSave() {
  if (!proInfo.value || saving.value || deleting.value || !validateBeforeSave()) {
    return
  }
  if (pageType.value === 'edit') {
    if (proInfo.value.runningTasks != null) {
      ElMessage.warning('程序运行中不可修改参数')
      return
    }
    if (!validateForbidTime()) return
  }
  saving.value = true
  try {
    if (pageType.value === 'edit') {
      try {
        await updateGroupPro(proInfo.value, { silent: true })
        ElMessage.success('操作成功')
      } catch (e) {
        if (e?.code === 40106) {
          ElMessage.warning('程序运行中不可修改参数')
          return
        }
        if (e?.message || e?.msg || e?.err) {
          ElMessage.error(e.message || e.msg || e.err)
        }
        throw e
      }
    } else {
      await addGroupPro(proInfo.value)
      ElMessage.success('操作成功')
    }
    farmStore.setProInfo(null)
    farmStore.farmChange()
    setTimeout(() => {
      router.replace('/irrigation-program')
    }, 600)
  } catch (e) {
    console.error('[ProgramEdit] 保存失败', e)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!proInfo.value?.id || saving.value || deleting.value) return
  try {
    await ElMessageBox.confirm('请确认是否删除程序？', '删除程序', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    deleting.value = true
    await deleteGroupPro(proInfo.value.id)
    ElMessage.success('操作成功')
    farmStore.setProInfo(null)
    farmStore.farmChange()
    setTimeout(() => {
      router.replace('/irrigation-program')
    }, 600)
  } catch (e) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      console.error('[ProgramEdit] 删除失败', e)
    }
  } finally {
    deleting.value = false
  }
}

async function loadEditProgram() {
  const listItem = farmStore.s_pro_info
  if (!listItem?.id) {
    ElMessage.warning('请先选择轮灌程序')
    router.replace('/irrigation-program')
    return
  }
  pageLoading.value = true
  try {
    const res = await getProDetail(listItem.id)
    proInfo.value = res?.data ? JSON.parse(JSON.stringify(res.data)) : null
    if (!proInfo.value) {
      ElMessage.warning('轮灌程序数据缺失')
      router.replace('/irrigation-program')
      return
    }
    ensureTimerTaskConfig()
    await fetchLandList()
    if (route.query.event === 'setTime') {
      setTimeout(() => scrollToStartTime(), 600)
    }
  } catch (e) {
    console.error('[ProgramEdit] 获取详情失败', e)
    router.replace('/irrigation-program')
  } finally {
    pageLoading.value = false
  }
}

function onCancel() {
  if (window.history.length > 1) router.back()
  else router.replace('/irrigation-program')
}

onMounted(async () => {
  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    router.replace('/irrigation-program')
    return
  }
  if (pageType.value === 'edit') {
    await loadEditProgram()
    return
  }
  proInfo.value = createDefaultProInfo(farmId)
  initOpenTime()
  await fetchLandList()
  setTimeout(() => nameInputRef.value?.focus?.(), 300)
})
</script>

<style scoped>
.program-edit-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
  overflow: hidden;
}

.program-edit-page__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: #fff;
  border-bottom: 1px solid #edf1f7;
}

.program-edit-page__head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.program-edit-page__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.program-edit-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.program-edit-page__actions {
  display: flex;
  gap: 12px;
}

.program-edit-page__btn {
  min-width: 100px;
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.program-edit-page__btn.is-plain {
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #303133;
}

.program-edit-page__btn.is-primary {
  border: none;
  background: #3653a0;
  color: #fff;
}

.program-edit-page__btn.is-danger {
  border: 1px solid #f56c6c;
  background: #fff;
  color: #f56c6c;
}

.program-edit-page__btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.program-edit-page__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.program-edit-page__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 20px;
  padding: 20px 28px 28px;
  overflow: hidden;
}

.program-edit-page__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
}

.program-edit-page__main > .program-card:not(.program-card--groups) {
  flex-shrink: 0;
}

.program-edit-page__side {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  max-height: 100%;
  align-self: stretch;
  overflow: hidden;
}

.program-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  overflow: hidden;
}

.program-card--groups {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.program-card--groups .program-card__head {
  flex-shrink: 0;
}

.program-card--groups .program-card__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.program-card--start {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.program-edit-page__side > .program-card:not(.program-card--start) {
  flex-shrink: 0;
}

.program-card--start .program-card__head {
  flex-shrink: 0;
}

.program-card--start .program-card__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.program-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 24px;
  border-bottom: 1px solid #edf1f7;
}

.program-card__icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8ecf5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.program-card__icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.program-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.program-card__badge {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 12px;
  background: #edf1f7;
  color: #3653a0;
  font-size: 12px;
  font-weight: 600;
}

.program-card__body {
  padding: 20px 24px 24px;
}

.program-field {
  margin-bottom: 18px;
}

.program-field--clickable {
  cursor: pointer;
}

.program-field--inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.program-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.program-field--inline .program-field__label {
  margin-bottom: 0;
  flex-shrink: 0;
}

.program-field__input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
}

.program-field__input:focus {
  border-color: #3653a0;
}

.program-field__select {
  width: 100%;
}

.program-field__value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
}

.program-field__value .is-placeholder {
  color: #c0c4cc;
}

.program-field__chevron {
  color: #c0c4cc;
  font-size: 18px;
}

.program-field__number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.program-field__unit {
  font-size: 14px;
  color: #606266;
}

.program-field__duration-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 160px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.program-field__picker {
  width: 100%;
}

.program-field__picker--full {
  width: 100%;
}

.program-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-top: 8px;
  border-radius: 10px;
  background: #f8fafc;
}

.program-switch-row__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.program-switch-row__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.program-groups-empty {
  padding: 24px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.program-group-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  background: #f8fafc;
  cursor: grab;
}

.program-group-row__drag {
  color: #c0c4cc;
  font-size: 14px;
  cursor: grab;
  user-select: none;
}

.program-group-row__index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3653a0;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.program-group-row__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.program-group-row__duration {
  min-width: 120px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #3653a0;
  cursor: pointer;
  flex-shrink: 0;
}

.program-group-row__delete {
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
}

.program-group-row__delete:hover {
  color: #f56c6c;
}

.program-add-group-btn {
  width: 100%;
  height: 44px;
  margin-top: 8px;
  border: 1px dashed #3653a0;
  border-radius: 10px;
  background: #fff;
  color: #3653a0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.program-add-group-btn:hover {
  background: #f0f4ff;
}

.program-forbid {
  margin-bottom: 18px;
}

.program-forbid__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #303133;
}

.program-forbid__add {
  width: 24px;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.program-forbid__switch {
  margin-left: auto;
}

.program-forbid__row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.program-forbid__col {
  width: 100%;
  position: relative;
}

.program-forbid__col .program-field__picker {
  width: 100%;
}

.program-forbid__sub {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #909399;
}

.program-forbid__sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.program-forbid__del {
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
}

.program-forbid__plus-one {
  position: absolute;
  right: 8px;
  bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #3653a0;
}

.program-date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.program-date-range__sep {
  font-size: 14px;
  color: #909399;
  flex-shrink: 0;
}

.program-week :deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

@media (max-width: 1100px) {
  .program-edit-page__body {
    flex-direction: column;
    overflow: auto;
  }

  .program-edit-page__main {
    overflow: visible;
  }

  .program-edit-page__side {
    width: 100%;
    max-height: none;
    overflow: visible;
  }

  .program-card--groups {
    flex: none;
    max-height: 420px;
  }

  .program-card--start {
    flex: none;
    max-height: 420px;
  }
}
</style>
