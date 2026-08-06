<template>
  <div class="group-edit-page">
    <div class="group-edit-page__head">
      <button type="button" class="group-edit-page__back" @click="onBack">
        ← 返回
      </button>
      <h1 class="group-edit-page__title">{{ pageTitle }}</h1>
    </div>

    <div v-if="groupParam" class="group-edit-card">
      <div class="group-edit-field">
        <label class="group-edit-field__label">轮灌组名称</label>
        <input
          ref="nameInputRef"
          v-model="groupParam.name"
          class="group-edit-field__input"
          type="text"
          placeholder="请输入轮灌组名称"
          maxlength="50"
        />
      </div>
      <div
        class="group-edit-row"
        :class="{ 'is-clickable': pageType === 'edit' }"
        @click="toChosePort"
      >
        <span class="group-edit-row__label">出水口数量</span>
        <span class="group-edit-row__value">
          {{ outletCountText }}
          <span v-if="pageType === 'edit'" class="group-edit-row__chevron">›</span>
        </span>
      </div>
      <div
        class="group-edit-row"
        :class="{ 'is-clickable': pageType === 'edit' }"
        @click="toCircleLand"
      >
        <span class="group-edit-row__label">轮灌组灌区</span>
        <span class="group-edit-row__value">
          {{ areaText }}
          <span v-if="pageType === 'edit'" class="group-edit-row__chevron">›</span>
        </span>
      </div>
    </div>

    <div v-else class="group-edit-empty">轮灌组数据缺失，请返回重试</div>

    <div v-if="groupParam" class="group-edit-footer">
      <template v-if="pageType === 'edit'">
        <button
          type="button"
          class="group-edit-footer__btn is-danger"
          :disabled="saving"
          @click="onDelete"
        >
          删除
        </button>
        <button
          type="button"
          class="group-edit-footer__btn is-primary"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="group-edit-footer__btn is-plain"
          :disabled="saving"
          @click="onBack"
        >
          上一步
        </button>
        <button
          type="button"
          class="group-edit-footer__btn is-primary"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * 对齐移动端 pages/home/activity/group/group_edit
 * add: farmStore.s_add_group
 * edit: farmStore.s_edit_group_draft / s_group_detail_info
 * 编辑出水口 → /map/edit-group?from=edit
 * 编辑灌区 → /map/edit-plot?type=editGroup
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addGroup, deleteGroup, updateGroup } from '@/api/irrigationGroup'
import { useFarmStore } from '@/store/farm'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const groupParam = ref(null)
const saving = ref(false)
const nameInputRef = ref(null)

const pageType = computed(() => String(route.query.type || 'add'))
const pageTitle = computed(() =>
  pageType.value === 'edit' ? '编辑轮灌组' : '新建轮灌组'
)

const outletCountText = computed(() => {
  const n = groupParam.value?.outlets?.length ?? 0
  return `${n}个`
})

const areaText = computed(() => {
  const area = groupParam.value?.area
  if (area == null || area === '') return '无'
  const num = Number(area)
  return Number.isFinite(num) ? `${num.toFixed(2)}亩` : '无'
})

function buildOutletsFromDetail(info) {
  const outlets = []
  ;(info?.outletPiles || []).forEach((pile) => {
    ;(pile.waterOutletPile?.ports || []).forEach((port) => {
      outlets.push({ outletId: port.id })
    })
  })
  return outlets
}

/** 对齐移动端 convertOutletPileData */
function convertOutletPileData(groupInfo) {
  const landId = groupInfo?.landId
  const outletPiles = groupInfo?.outletPiles || []
  return outletPiles.map((pile) => {
    const waterPile = pile.waterOutletPile || {}
    const ports = waterPile.ports || []
    return {
      id: pile.id,
      landId,
      type: pile.type,
      name: pile.name,
      deviceCode: pile.deviceCode,
      outletType: waterPile.outletType,
      waterOutletPileId: waterPile.id,
      outletPorts: ports.map((port) => ({
        id: port.id,
        outletNo: port.outletNo,
        outletName: port.outletName,
        bindGroupIds: [],
        isCheck: true
      }))
    }
  })
}

function persistDraft() {
  if (pageType.value !== 'edit' || !groupParam.value) return
  farmStore.setEditGroupDraft(groupParam.value)
}

function applyPendingChange() {
  if (pageType.value !== 'edit' || !groupParam.value) return
  const pending = farmStore.consumePendingGroupChange()
  if (!pending?.topic) return

  if (pending.topic === 'changePort' && pending.data) {
    groupParam.value = {
      ...groupParam.value,
      outlets: Array.isArray(pending.data.outlets)
        ? pending.data.outlets.map((o) => ({ ...o }))
        : [],
      landId: pending.data.landId ?? groupParam.value.landId
    }
    persistDraft()
    return
  }

  if (pending.topic === 'changeLand' && pending.data) {
    const landInfo = pending.data
    groupParam.value = {
      ...groupParam.value,
      area: landInfo.areaMu,
      areaJson: JSON.stringify({
        landPoint: landInfo.landPoint,
        fillColor: landInfo.fillColor
      })
    }
    persistDraft()
  }
}

function syncFromStore() {
  if (pageType.value === 'edit') {
    const draft = farmStore.s_edit_group_draft
    const info = farmStore.s_group_detail_info
    if (draft?.id) {
      groupParam.value = {
        ...draft,
        name: draft.name || '',
        outlets: Array.isArray(draft.outlets)
          ? draft.outlets.map((o) => ({ ...o }))
          : []
      }
    } else if (info?.id) {
      groupParam.value = {
        id: info.id,
        farmId: info.farmId,
        landId: info.landId,
        name: info.name || '',
        area: info.area,
        areaJson: info.areaJson,
        outlets: buildOutletsFromDetail(info)
      }
      persistDraft()
    } else {
      groupParam.value = null
      return
    }
    applyPendingChange()
    return
  }

  const addDraft = farmStore.s_add_group
  if (!addDraft) {
    groupParam.value = null
    return
  }
  groupParam.value = {
    ...addDraft,
    name: addDraft.name || '',
    outlets: Array.isArray(addDraft.outlets) ? [...addDraft.outlets] : []
  }
}

function onBack() {
  if (pageType.value === 'edit') {
    farmStore.setEditGroupDraft(null)
    farmStore.setChosePort(null)
    farmStore.setPendingGroupChange(null)
  }
  if (window.history.length > 1) router.back()
  else if (pageType.value === 'edit') {
    router.replace('/irrigation-group')
  } else {
    router.replace('/map/edit-group?from=home')
  }
}

function toChosePort() {
  if (pageType.value !== 'edit' || !groupParam.value) return
  persistDraft()
  farmStore.setChosePort(groupParam.value)
  router.push({ path: '/map/edit-group', query: { from: 'edit' } })
}

function toCircleLand() {
  if (pageType.value !== 'edit' || !groupParam.value?.id) return
  persistDraft()
  const info = farmStore.s_group_detail_info
  const deviceList = convertOutletPileData(info || groupParam.value)
  farmStore.setLandIdGroup(groupParam.value.id)
  farmStore.setGroupDeviceList(deviceList)
  router.push({ path: '/map/edit-plot', query: { type: 'editGroup' } })
}

async function onSave() {
  if (!groupParam.value || saving.value) return
  const name = (groupParam.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入轮灌组名称')
    nameInputRef.value?.focus?.()
    return
  }
  saving.value = true
  try {
    if (pageType.value === 'edit') {
      await updateGroup({
        ...groupParam.value,
        name
      })
      ElMessage.success('操作成功')
      farmStore.setEditGroupDraft(null)
      farmStore.setChosePort(null)
      farmStore.setPendingGroupChange(null)
      farmStore.farmChange()
      setTimeout(() => {
        router.replace({
          path: '/irrigation-group/detail',
          query: { id: String(groupParam.value.id) }
        })
      }, 600)
    } else {
      await addGroup({
        ...groupParam.value,
        name
      })
      ElMessage.success('操作成功')
      farmStore.setAddGroup(null)
      farmStore.setLandIdGroup(null)
      farmStore.setGroupDeviceList([])
      farmStore.farmChange()
      setTimeout(() => {
        router.replace('/irrigation-group')
      }, 600)
    }
  } catch (e) {
    console.error('[GroupEdit] 保存轮灌组失败', e)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!groupParam.value?.id || saving.value) return
  try {
    await ElMessageBox.confirm('请确认是否删除轮灌组？', '删除轮灌组', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    saving.value = true
    await deleteGroup(groupParam.value.id)
    ElMessage.success('操作成功')
    farmStore.setGroupDetailInfo(null)
    farmStore.setGroupListItem(null)
    farmStore.setEditGroupDraft(null)
    farmStore.setChosePort(null)
    farmStore.setPendingGroupChange(null)
    farmStore.farmChange()
    setTimeout(() => {
      router.replace('/irrigation-group')
    }, 600)
  } catch (e) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      console.error('[GroupEdit] 删除轮灌组失败', e)
    }
  } finally {
    saving.value = false
  }
}

watch(
  () => groupParam.value?.name,
  () => {
    if (pageType.value === 'edit') persistDraft()
  }
)

onMounted(() => {
  syncFromStore()
  setTimeout(() => nameInputRef.value?.focus?.(), 300)
})
</script>

<style scoped>
.group-edit-page {
  height: 100%;
  min-height: 100%;
  padding: 24px 28px 100px;
  background: #f3f4f6;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.group-edit-page__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.group-edit-page__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.group-edit-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.group-edit-card {
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 28px 32px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
  overflow: auto;
}

.group-edit-field {
  margin-bottom: 20px;
}

.group-edit-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.group-edit-field__input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  font-size: 15px;
  box-sizing: border-box;
  outline: none;
}

.group-edit-field__input:focus {
  border-color: #3653a0;
}

.group-edit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0;
  border-top: 1px solid #edf1f7;
}

.group-edit-row.is-clickable {
  cursor: pointer;
}

.group-edit-row.is-clickable:hover .group-edit-row__value {
  color: #3653a0;
}

.group-edit-row__label {
  font-size: 14px;
  color: #606266;
}

.group-edit-row__value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.group-edit-row__value .group-edit-row__chevron {
  font-size: 18px;
  font-weight: 400;
  color: #c0c4cc;
  line-height: 1;
}

.group-edit-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  border-radius: 16px;
  background: #fff;
  text-align: center;
  color: #909399;
  box-sizing: border-box;
}

.group-edit-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #edf1f7;
  box-shadow: 0 -4px 16px rgba(31, 45, 61, 0.06);
  z-index: 10;
}

.group-edit-footer__btn {
  min-width: 160px;
  height: 44px;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.group-edit-footer__btn.is-plain {
  border: 1px solid #3653a0;
  background: #fff;
  color: #3653a0;
}

.group-edit-footer__btn.is-primary {
  border: none;
  background: #3653a0;
  color: #fff;
}

.group-edit-footer__btn.is-danger {
  border: 1px solid #f56c6c;
  background: #fff;
  color: #f56c6c;
}

.group-edit-footer__btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
