<template>
  <el-dialog
    :model-value="modelValue"
    width="560px"
    append-to-body
    destroy-on-close
    align-center
    draggable
    overflow
    :close-on-click-modal="false"
    class="group-edit-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
    @closed="onClosed"
  >
    <template #header>
      <div class="group-edit-dialog__title">编辑轮灌组</div>
    </template>

    <div v-if="groupParam" class="group-edit-dialog__body">
      <div class="group-edit-dialog__row">
        <div class="group-edit-dialog__field">
          <label class="group-edit-dialog__label">轮灌组名称</label>
          <input
            ref="nameInputRef"
            v-model="groupParam.name"
            class="group-edit-dialog__input"
            type="text"
            placeholder="如：轮灌组1-1"
            maxlength="50"
          />
        </div>
        <div class="group-edit-dialog__field">
          <label class="group-edit-dialog__label">出水口管理</label>
          <button
            type="button"
            class="group-edit-dialog__select"
            @click="toChosePort"
          >
            <span>{{ outletCountText }}</span>
            <i class="group-edit-dialog__chevron"></i>
          </button>
        </div>
      </div>

      <div class="group-edit-dialog__field">
        <label class="group-edit-dialog__label">轮灌组灌区</label>
        <button
          type="button"
          class="group-edit-dialog__select"
          @click="toCircleLand"
        >
          <span>{{ areaText }}</span>
          <i class="group-edit-dialog__chevron"></i>
        </button>
      </div>
    </div>

    <div v-else class="group-edit-dialog__empty">轮灌组数据缺失，请关闭后重试</div>

    <template v-if="groupParam" #footer>
      <div class="group-edit-dialog__footer">
        <button
          type="button"
          class="group-edit-dialog__btn is-danger"
          :disabled="saving"
          @click="onDelete"
        >
          删除
        </button>
        <button
          type="button"
          class="group-edit-dialog__btn is-primary"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 编辑轮灌组弹窗
 * 业务对齐 GroupEdit.vue（type=edit）：出水口 / 灌区编辑、保存、删除
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteGroup, updateGroup } from '@/api/irrigationGroup'
import { useFarmStore } from '@/store/farm'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const router = useRouter()
const farmStore = useFarmStore()

const groupParam = ref(null)
const saving = ref(false)
const nameInputRef = ref(null)
/** 跳转出水口/灌区编辑时不清理草稿，便于返回后恢复弹窗 */
let leaveForSubFlow = false
let didPersistAction = false

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

/** 对齐移动端 / GroupEdit convertOutletPileData */
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
  if (!groupParam.value) return
  farmStore.setEditGroupDraft(groupParam.value)
}

function clearEditState() {
  farmStore.setEditGroupDraft(null)
  farmStore.setChosePort(null)
  farmStore.setPendingGroupChange(null)
}

function applyPendingChange() {
  if (!groupParam.value) return
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
}

function onVisibleChange(v) {
  emit('update:modelValue', v)
}

function onOpened() {
  leaveForSubFlow = false
  didPersistAction = false
  syncFromStore()
  setTimeout(() => nameInputRef.value?.focus?.(), 200)
}

function onClosed() {
  groupParam.value = null
  if (leaveForSubFlow || didPersistAction) {
    leaveForSubFlow = false
    didPersistAction = false
    return
  }
  clearEditState()
}

function toChosePort() {
  if (!groupParam.value) return
  leaveForSubFlow = true
  persistDraft()
  farmStore.setChosePort(groupParam.value)
  emit('update:modelValue', false)
  router.push({ path: '/map/edit-group', query: { from: 'edit' } })
}

function toCircleLand() {
  if (!groupParam.value?.id) return
  leaveForSubFlow = true
  persistDraft()
  const info = farmStore.s_group_detail_info
  const deviceList = convertOutletPileData(info || groupParam.value)
  farmStore.setLandIdGroup(groupParam.value.id)
  farmStore.setGroupDeviceList(deviceList)
  emit('update:modelValue', false)
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
    await updateGroup({
      ...groupParam.value,
      name
    })
    ElMessage.success('操作成功')
    didPersistAction = true
    clearEditState()
    farmStore.farmChange()
    emit('update:modelValue', false)
    emit('saved', { id: groupParam.value.id })
  } catch (e) {
    console.error('[GroupEditDialog] 保存轮灌组失败', e)
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
    didPersistAction = true
    farmStore.setGroupDetailInfo(null)
    farmStore.setGroupListItem(null)
    clearEditState()
    farmStore.farmChange()
    emit('update:modelValue', false)
    emit('deleted')
    setTimeout(() => {
      router.replace('/irrigation-group')
    }, 600)
  } catch (e) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      console.error('[GroupEditDialog] 删除轮灌组失败', e)
    }
  } finally {
    saving.value = false
  }
}

watch(
  () => groupParam.value?.name,
  () => {
    if (props.modelValue && groupParam.value) persistDraft()
  }
)
</script>

<style scoped>
.group-edit-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.3;
}

.group-edit-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 2px 8px;
}

.group-edit-dialog__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.group-edit-dialog__field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-edit-dialog__label {
  font-size: 13px;
  color: #64748b;
  line-height: 1.2;
}

.group-edit-dialog__input,
.group-edit-dialog__select {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  font-size: 14px;
  color: #0f172a;
  box-sizing: border-box;
  outline: none;
}

.group-edit-dialog__input::placeholder {
  color: #c0c4cc;
}

.group-edit-dialog__input:focus {
  border-color: #3653a0;
}

.group-edit-dialog__select {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  text-align: left;
  font-weight: 500;
}

.group-edit-dialog__select:hover {
  border-color: #3653a0;
}

.group-edit-dialog__chevron {
  width: 8px;
  height: 8px;
  border-right: 2px solid #94a3b8;
  border-bottom: 2px solid #94a3b8;
  transform: rotate(45deg);
  margin-top: -4px;
  flex-shrink: 0;
}

.group-edit-dialog__empty {
  padding: 32px 12px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.group-edit-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.group-edit-dialog__btn {
  min-width: 88px;
  height: 40px;
  padding: 0 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
}

.group-edit-dialog__btn.is-danger {
  border: 1px solid #f56c6c;
  background: #fff;
  color: #f56c6c;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.16);
}

.group-edit-dialog__btn.is-primary {
  border: none;
  background: #274082;
  color: #fff;
  box-shadow: 0 6px 14px rgba(39, 64, 130, 0.28);
}

.group-edit-dialog__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style>
.group-edit-dialog.el-dialog {
  border-radius: 24px;
  overflow: hidden;
}

.group-edit-dialog .el-dialog__header {
  margin: 0;
  padding: 22px 24px 8px;
}

.group-edit-dialog .el-dialog__body {
  padding: 8px 24px 12px;
}

.group-edit-dialog .el-dialog__footer {
  padding: 16px 24px 22px;
  border-top: 1px solid #edf1f7;
}
</style>
