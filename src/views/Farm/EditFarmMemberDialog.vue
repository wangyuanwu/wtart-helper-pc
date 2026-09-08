<template>
  <el-dialog
    :model-value="modelValue"
    width="720px"
    append-to-body
    destroy-on-close
    align-center
    :close-on-click-modal="false"
    class="farm-member-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
  >
    <template #header>
      <div class="farm-member-dialog__header">
        <h3 class="farm-member-dialog__title">
          {{ isEdit ? '编辑成员' : '添加成员' }}
        </h3>
        <p class="farm-member-dialog__subtitle">
          {{
            isEdit
              ? '请修改成员相关信息并调整相应权限'
              : '请输入新成员的相关信息并分配相应权限'
          }}
        </p>
      </div>
    </template>

    <div class="farm-member-dialog__body">
      <div class="farm-member-dialog__fields">
        <div class="farm-member-dialog__field">
          <label class="farm-member-dialog__label">成员名称（姓名）</label>
          <input
            v-model="memberInfo.nickName"
            class="farm-member-dialog__input"
            type="text"
            placeholder="如：张伟"
            maxlength="50"
          />
        </div>
        <div class="farm-member-dialog__field">
          <label class="farm-member-dialog__label">成员电话</label>
          <div class="farm-member-dialog__phone">
            <span class="farm-member-dialog__phone-prefix">+86</span>
            <input
              v-model="memberInfo.phoneNumber"
              class="farm-member-dialog__input is-phone"
              type="tel"
              maxlength="11"
              placeholder="请输入手机号"
            />
          </div>
        </div>
      </div>

      <h4 class="farm-member-dialog__section-title">权限管理</h4>
      <div class="farm-member-dialog__roles">
        <button
          type="button"
          class="farm-member-role-card"
          :class="{ 'is-active': roleType === 'master' }"
          @click="roleType = 'master'"
        >
          <div class="farm-member-role-card__icon">
            <img :src="roleSuperIcon" alt="" />
          </div>
          <div class="farm-member-role-card__text">
            <div class="farm-member-role-card__name">超级成员</div>
            <div class="farm-member-role-card__desc">管理本农场所有地块</div>
          </div>
        </button>

        <div
          class="farm-member-role-card is-member"
          :class="{ 'is-active': roleType === 'member' }"
          @click="roleType = 'member'"
        >
          <div class="farm-member-role-card__top">
            <div class="farm-member-role-card__icon">
              <img :src="roleMemberIcon" alt="" />
            </div>
            <button
              type="button"
              class="farm-member-role-card__pick"
              @click.stop="openLandPicker"
            >
              + 选择地块
            </button>
          </div>
          <div class="farm-member-role-card__text">
            <div class="farm-member-role-card__name">普通成员</div>
            <div class="farm-member-role-card__desc">管理本农场指定地块</div>
          </div>
          <div v-if="selectedLands.length" class="farm-member-role-card__tags">
            <span
              v-for="land in selectedLands"
              :key="land.id"
              class="farm-member-tag"
            >
              {{ land.name }}
              <button
                type="button"
                class="farm-member-tag__close"
                @click.stop="removeLand(land.id)"
              >
                ×
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="farm-member-dialog__footer">
        <button
          v-if="isEdit"
          type="button"
          class="farm-member-dialog__btn is-danger"
          :disabled="saving"
          @click="onDelete"
        >
          删除
        </button>
        <button
          v-else
          type="button"
          class="farm-member-dialog__btn is-cancel"
          :disabled="saving"
          @click="onCancel"
        >
          取消
        </button>
        <button
          type="button"
          class="farm-member-dialog__btn is-primary"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </template>
  </el-dialog>

  <!-- 选择管理地块 -->
  <el-dialog
    v-model="landPickerVisible"
    width="560px"
    append-to-body
    align-center
    :close-on-click-modal="false"
    class="farm-land-picker-dialog"
  >
    <template #header>
      <div class="farm-land-picker-dialog__header">
        <h3 class="farm-land-picker-dialog__title">选择管理地块</h3>
        <p class="farm-land-picker-dialog__subtitle">
          请勾选该成员负责管理的灌溉区域
        </p>
      </div>
    </template>

    <div class="farm-land-picker-dialog__list">
      <label
        v-for="item in landOptions"
        :key="item.id"
        class="farm-land-picker-item"
        :class="{ 'is-checked': draftLandIds.includes(item.id) }"
      >
        <input
          v-model="draftLandIds"
          class="farm-land-picker-item__check"
          type="checkbox"
          :value="item.id"
        />
        <div class="farm-land-picker-item__main">
          <div class="farm-land-picker-item__name">{{ item.name }}</div>
          <div class="farm-land-picker-item__addr">
            <i class="iconfont icon-farm_ic_locate_02"></i>
            <span>位置：{{ item.address || '暂无地址' }}</span>
          </div>
        </div>
        <div class="farm-land-picker-item__area">
          <div class="farm-land-picker-item__area-label">土地面积</div>
          <div class="farm-land-picker-item__area-value">
            {{ formatArea(item.area) }}
            <small>亩</small>
          </div>
        </div>
      </label>
      <div v-if="!landOptions.length" class="farm-land-picker-dialog__empty">
        暂无地块
      </div>
    </div>

    <template #footer>
      <div class="farm-member-dialog__footer">
        <button
          type="button"
          class="farm-member-dialog__btn is-cancel"
          @click="landPickerVisible = false"
        >
          取消
        </button>
        <button
          type="button"
          class="farm-member-dialog__btn is-primary"
          @click="confirmLandPicker"
        >
          确定
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addMember, deleteMember, getMemberInfo, updateMember } from '@/api/farm'
import { useFarmStore } from '@/store/farm'
import roleSuperIcon from '@/assets/farm/ic_role_super.svg'
import roleMemberIcon from '@/assets/farm/ic_role_member.svg'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 'add' | 'edit' */
  type: { type: String, default: 'add' },
  /** 编辑态传入的成员信息 */
  member: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])

const farmStore = useFarmStore()

const isEdit = computed(() => props.type === 'edit')
const saving = ref(false)
const roleType = ref('master')
const landPickerVisible = ref(false)
const draftLandIds = ref([])

const memberInfo = reactive({
  id: null,
  farmId: 0,
  nickName: '',
  phoneNumber: '',
  roleId: 11,
  landIds: []
})

const landOptions = computed(() => farmStore.s_land_list || [])

const selectedLands = computed(() => {
  if (!memberInfo.landIds?.length) return []
  return landOptions.value.filter((item) =>
    memberInfo.landIds.includes(item.id)
  )
})

function formatArea(area) {
  if (area == null || area === '') return '0'
  const n = Number(area)
  if (!Number.isFinite(n)) return String(area)
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 1 })
}

function checkPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim())
}

function syncRoleFromType() {
  memberInfo.roleId = roleType.value === 'master' ? 11 : 12
}

function roleTypeFromRoleId(roleId) {
  return Number(roleId) === 12 ? 'member' : 'master'
}

function resetForm() {
  memberInfo.id = null
  memberInfo.farmId = 0
  memberInfo.nickName = ''
  memberInfo.phoneNumber = ''
  memberInfo.roleId = 11
  memberInfo.landIds = []
  roleType.value = 'master'
}

async function initForm() {
  const farmId = farmStore.selectFarm?.id
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    onVisibleChange(false)
    return
  }

  if (!isEdit.value) {
    resetForm()
    memberInfo.farmId = farmId
    syncRoleFromType()
    return
  }

  const cached = props.member
  if (!cached?.id) {
    ElMessage.warning('成员信息异常')
    onVisibleChange(false)
    return
  }

  memberInfo.id = cached.id
  memberInfo.farmId = cached.farmId ?? farmId
  memberInfo.nickName = cached.nickName || ''
  memberInfo.phoneNumber = cached.phoneNumber || ''
  memberInfo.roleId = cached.roleId ?? 11
  memberInfo.landIds = Array.isArray(cached.landIds) ? [...cached.landIds] : []
  roleType.value = roleTypeFromRoleId(memberInfo.roleId)
  await loadMemberLands()
}

async function loadMemberLands() {
  if (!memberInfo.id) return
  try {
    const res = await getMemberInfo(memberInfo.id)
    const lands = res?.data?.lands
    if (Array.isArray(lands)) {
      memberInfo.landIds = lands.map((item) => item.id)
    }
  } catch (e) {
    console.error('[EditFarmMemberDialog] 获取成员地块失败', e)
  }
}

function onVisibleChange(val) {
  emit('update:modelValue', val)
}

function onOpened() {
  initForm()
}

function onCancel() {
  onVisibleChange(false)
}

async function onDelete() {
  if (!memberInfo.id) return
  try {
    await ElMessageBox.confirm('请确认是否删除成员？', '删除成员', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    saving.value = true
    await deleteMember(memberInfo.id)
    ElMessage.success('操作成功')
    onVisibleChange(false)
    emit('success')
  } catch (e) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      console.error('[EditFarmMemberDialog] 删除成员失败', e)
    }
  } finally {
    saving.value = false
  }
}

function openLandPicker() {
  roleType.value = 'member'
  draftLandIds.value = [...memberInfo.landIds]
  landPickerVisible.value = true
}

function confirmLandPicker() {
  memberInfo.landIds = [...draftLandIds.value]
  landPickerVisible.value = false
}

function removeLand(id) {
  memberInfo.landIds = memberInfo.landIds.filter((item) => item !== id)
}

async function onSave() {
  syncRoleFromType()
  const nickName = (memberInfo.nickName || '').trim()
  if (!nickName) {
    ElMessage.warning('请输入成员名称')
    return
  }
  if (!checkPhone(memberInfo.phoneNumber)) {
    ElMessage.warning('请输入正确手机号')
    return
  }
  if (roleType.value === 'member' && !memberInfo.landIds.length) {
    ElMessage.warning('请选择地块')
    return
  }

  saving.value = true
  try {
    const payload = {
      farmId: memberInfo.farmId,
      nickName,
      phoneNumber: memberInfo.phoneNumber,
      roleId: memberInfo.roleId,
      landIds: roleType.value === 'member' ? memberInfo.landIds : []
    }
    if (isEdit.value) {
      await updateMember({ ...payload, id: memberInfo.id })
    } else {
      await addMember(payload)
    }
    ElMessage.success('操作成功')
    onVisibleChange(false)
    emit('success')
  } catch (e) {
    console.error('[EditFarmMemberDialog] 保存成员失败', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.farm-member-dialog__header {
  padding-right: 24px;
}

.farm-member-dialog__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.3;
}

.farm-member-dialog__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
  font-weight: 400;
}

.farm-member-dialog__body {
  padding: 4px 0 8px;
}

.farm-member-dialog__fields {
  display: flex;
  gap: 16px;
}

.farm-member-dialog__field {
  flex: 1;
  min-width: 0;
}

.farm-member-dialog__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7280;
}

.farm-member-dialog__input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: #111;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}

.farm-member-dialog__input:focus {
  border-color: #3653a0;
}

.farm-member-dialog__phone {
  display: flex;
  align-items: center;
  height: 42px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
}

.farm-member-dialog__phone:focus-within {
  border-color: #3653a0;
}

.farm-member-dialog__phone-prefix {
  flex-shrink: 0;
  padding: 0 12px;
  font-size: 14px;
  color: #6b7280;
  border-right: 1px solid #e5e7eb;
  line-height: 42px;
}

.farm-member-dialog__input.is-phone {
  border: none;
  border-radius: 0;
  height: 40px;
}

.farm-member-dialog__section-title {
  margin: 22px 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: #111;
}

.farm-member-dialog__roles {
  display: flex;
  gap: 14px;
  align-items: stretch;
}

.farm-member-role-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.farm-member-role-card.is-active {
  border-color: #3653a0;
  border-width: 3px;
  box-shadow: 0 0 0 1px rgba(54, 83, 160, 0.08);
}

.farm-member-role-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.farm-member-role-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eef2ff;
  color: #3653a0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.farm-member-role-card__icon img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
}

.farm-member-role-card__pick {
  flex-shrink: 0;
  border: 1px solid #dbe3f5;
  background: #fff;
  color: #3653a0;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.farm-member-role-card__pick:hover {
  background: #f5f8ff;
}

.farm-member-role-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #111;
  line-height: 1.3;
}

.farm-member-role-card__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
}

.farm-member-role-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
}

.farm-member-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #eef2ff;
  color: #3653a0;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.farm-member-tag__close {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 0 0 2px;
  opacity: 0.7;
}

.farm-member-tag__close:hover {
  opacity: 1;
}

.farm-member-dialog__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.farm-member-dialog__btn {
  min-width: 88px;
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
}

.farm-member-dialog__btn.is-cancel {
  background: transparent;
  color: #6b7280;
}

.farm-member-dialog__btn.is-cancel:hover {
  color: #374151;
}

.farm-member-dialog__btn.is-danger {
  background: #fff;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.farm-member-dialog__btn.is-danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fca5a5;
}

.farm-member-dialog__btn.is-primary {
  background: #274082;
  color: #fff;
  box-shadow: 0 6px 14px rgba(39, 64, 130, 0.28);
}

.farm-member-dialog__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 地块选择弹窗 */
.farm-land-picker-dialog__header {
  padding-right: 24px;
}

.farm-land-picker-dialog__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.3;
}

.farm-land-picker-dialog__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
  font-weight: 400;
}

.farm-land-picker-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding: 4px 2px 8px;
}

.farm-land-picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  cursor: pointer;
  box-sizing: border-box;
}

.farm-land-picker-item.is-checked {
  border-color: #3653a0;
  background: #f8faff;
}

.farm-land-picker-item__check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: #3653a0;
  cursor: pointer;
}

.farm-land-picker-item__main {
  flex: 1;
  min-width: 0;
}

.farm-land-picker-item__name {
  font-size: 15px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1.3;
}

.farm-land-picker-item__addr {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
}

.farm-land-picker-item__addr .iconfont {
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
}

.farm-land-picker-item__addr span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.farm-land-picker-item__area {
  flex-shrink: 0;
  text-align: right;
  min-width: 72px;
}

.farm-land-picker-item__area-label {
  font-size: 12px;
  color: #9ca3af;
}

.farm-land-picker-item__area-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 700;
  color: #111;
  line-height: 1.2;
}

.farm-land-picker-item__area-value small {
  font-size: 12px;
  font-weight: 500;
  margin-left: 2px;
  color: #6b7280;
}

.farm-land-picker-dialog__empty {
  padding: 40px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}
</style>

<style>
.farm-member-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.farm-member-dialog .el-dialog__header {
  padding: 20px 24px 8px;
  margin-right: 0;
}

.farm-member-dialog .el-dialog__body {
  padding: 8px 24px 12px;
}

.farm-member-dialog .el-dialog__footer {
  padding: 12px 24px 20px;
}

.farm-land-picker-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.farm-land-picker-dialog .el-dialog__header {
  padding: 20px 24px 8px;
  margin-right: 0;
}

.farm-land-picker-dialog .el-dialog__body {
  padding: 8px 24px 12px;
}

.farm-land-picker-dialog .el-dialog__footer {
  padding: 12px 24px 20px;
}
</style>
