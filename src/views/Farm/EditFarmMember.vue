<template>
  <div class="edit-member-page">
    <div class="edit-member-page__head">
      <button type="button" class="edit-member-page__back" @click="onBack">
        ← 返回
      </button>
      <h1 class="edit-member-page__title">
        {{ pageType === 'add' ? '添加成员' : '编辑成员' }}
      </h1>
    </div>

    <div class="edit-member-card">
      <div class="edit-member-field">
        <label class="edit-member-field__label">成员名称</label>
        <div class="edit-member-field__wrap">
          <input
            v-model="memberInfo.nickName"
            class="edit-member-field__input"
            type="text"
            placeholder="请输入成员名称"
          />
          <button
            v-if="memberInfo.nickName"
            type="button"
            class="edit-member-field__clear"
            @click="memberInfo.nickName = ''"
          >
            <i class="iconfont icon-farm_ic_erase"></i>
          </button>
        </div>
      </div>
      <div class="edit-member-field">
        <label class="edit-member-field__label">成员电话</label>
        <div class="edit-member-field__wrap">
          <input
            v-model="memberInfo.phoneNumber"
            class="edit-member-field__input"
            type="tel"
            maxlength="11"
            placeholder="请输入成员电话"
          />
          <button
            v-if="memberInfo.phoneNumber"
            type="button"
            class="edit-member-field__clear"
            @click="memberInfo.phoneNumber = ''"
          >
            <i class="iconfont icon-farm_ic_erase"></i>
          </button>
        </div>
      </div>
    </div>

    <h2 class="edit-member-section-title">角色权限</h2>
    <div class="edit-member-role-card">
      <label class="edit-member-role-item">
        <input v-model="roleType" type="radio" value="master" />
        <span>超级成员（管理农场所有地块）</span>
      </label>
      <label class="edit-member-role-item">
        <input v-model="roleType" type="radio" value="member" />
        <span>普通成员（管理指定地块）</span>
      </label>
      <button
        v-if="roleType === 'member'"
        type="button"
        class="edit-member-land-link"
        @click="landDialogVisible = true"
      >
        选择地块
      </button>
    </div>

    <template v-if="roleType === 'member'">
      <h2 class="edit-member-section-title">管理的地块</h2>
      <div class="edit-member-land-summary">
        {{ selectedLandText || '未选择任何地块' }}
      </div>
    </template>

    <div class="edit-member-footer">
      <button
        v-if="pageType === 'edit'"
        type="button"
        class="edit-member-footer__btn is-danger"
        :disabled="saving"
        @click="onDelete"
      >
        删除
      </button>
      <button
        type="button"
        class="edit-member-footer__btn is-primary"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <el-dialog
      v-model="landDialogVisible"
      title="地块选择"
      width="480px"
      append-to-body
    >
      <div class="edit-member-land-dialog">
        <label
          v-for="item in landOptions"
          :key="item.id"
          class="edit-member-land-option"
        >
          <input
            v-model="memberInfo.landIds"
            type="checkbox"
            :value="item.id"
          />
          <div>
            <div class="edit-member-land-option__name">{{ item.name }}</div>
            <div class="edit-member-land-option__addr">{{ item.address }}</div>
          </div>
        </label>
        <div v-if="!landOptions.length" class="edit-member-land-empty">
          暂无地块
        </div>
      </div>
      <template #footer>
        <el-button @click="landDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="landDialogVisible = false">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addMember,
  deleteMember,
  getMemberInfo,
  updateMember
} from '@/api/farm'
import { useFarmStore } from '@/store/farm'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const pageType = computed(() =>
  route.query.type === 'edit' ? 'edit' : 'add'
)

const saving = ref(false)
const landDialogVisible = ref(false)
/** master=超级成员(11)，member=普通成员(12)；对齐移动端，不可新建 roleId=10 */
const roleType = ref('master')

const memberInfo = reactive({
  id: null,
  farmId: 0,
  nickName: '',
  phoneNumber: '',
  roleId: 11,
  landIds: []
})

const landOptions = computed(() => farmStore.s_land_list || [])

const selectedLandText = computed(() => {
  if (!memberInfo.landIds?.length) return ''
  return landOptions.value
    .filter((item) => memberInfo.landIds.includes(item.id))
    .map((item) => item.name)
    .join('、')
})

function checkPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim())
}

function syncRoleFromType() {
  // 对齐移动端：超级成员 11 / 普通成员 12
  memberInfo.roleId = roleType.value === 'master' ? 11 : 12
}

function roleTypeFromRoleId(roleId) {
  // 12 → 普通成员；11（及移动端对 10 的默认表现）→ 超级成员
  return Number(roleId) === 12 ? 'member' : 'master'
}

function initForm() {
  const farmId = farmStore.selectFarm?.id
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    router.replace('/farm/edit')
    return
  }

  if (pageType.value === 'add') {
    memberInfo.farmId = farmId
    memberInfo.id = null
    memberInfo.nickName = ''
    memberInfo.phoneNumber = ''
    memberInfo.landIds = []
    // 对齐移动端：新增默认选中超级成员（isMaster=true → roleId=11）
    roleType.value = 'master'
    syncRoleFromType()
    return
  }

  const cached = farmStore.s_member_info
  if (!cached?.id) {
    ElMessage.warning('成员信息异常')
    router.replace('/farm/edit')
    return
  }

  memberInfo.id = cached.id
  memberInfo.farmId = cached.farmId ?? farmId
  memberInfo.nickName = cached.nickName || ''
  memberInfo.phoneNumber = cached.phoneNumber || ''
  memberInfo.roleId = cached.roleId ?? 11
  memberInfo.landIds = Array.isArray(cached.landIds) ? [...cached.landIds] : []
  roleType.value = roleTypeFromRoleId(memberInfo.roleId)
  loadMemberLands()
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
    console.error('[EditFarmMember] 获取成员地块失败', e)
  }
}

function onBack() {
  router.back()
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
    // 超级成员清空 landIds（管全部地块）；普通成员提交所选地块
    const payload = {
      farmId: memberInfo.farmId,
      nickName,
      phoneNumber: memberInfo.phoneNumber,
      roleId: memberInfo.roleId,
      landIds: roleType.value === 'member' ? memberInfo.landIds : []
    }
    if (pageType.value === 'edit') {
      await updateMember({ ...payload, id: memberInfo.id })
    } else {
      await addMember(payload)
    }
    ElMessage.success('操作成功')
    setTimeout(() => router.replace('/farm/edit'), 600)
  } catch (e) {
    console.error('[EditFarmMember] 保存成员失败', e)
  } finally {
    saving.value = false
  }
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
    setTimeout(() => router.replace('/farm/edit'), 600)
  } catch (e) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      console.error('[EditFarmMember] 删除成员失败', e)
    }
  } finally {
    saving.value = false
  }
}

onMounted(initForm)
</script>

<style scoped>
.edit-member-page {
  min-height: 100%;
  padding: 24px 28px 100px;
  background: #f3f4f6;
  box-sizing: border-box;
}

.edit-member-page__head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.edit-member-page__back {
  border: none;
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  color: #555;
  font-size: 14px;
}

.edit-member-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #111;
}

.edit-member-card,
.edit-member-role-card,
.edit-member-land-summary {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.edit-member-field {
  margin-bottom: 18px;
}

.edit-member-field:last-child {
  margin-bottom: 0;
}

.edit-member-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #888;
}

.edit-member-field__wrap {
  display: flex;
  align-items: center;
  background: #f5f6f8;
  border-radius: 10px;
  padding: 0 12px;
}

.edit-member-field__input {
  flex: 1;
  border: none;
  background: transparent;
  height: 44px;
  font-size: 15px;
  outline: none;
}

.edit-member-field__clear {
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
}

.edit-member-section-title {
  margin: 24px 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

.edit-member-role-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.edit-member-role-item:last-of-type {
  border-bottom: none;
}

.edit-member-land-link {
  margin-top: 8px;
  border: none;
  background: transparent;
  color: #2f6bff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.edit-member-land-summary {
  min-height: 80px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.edit-member-footer {
  position: fixed;
  left: 200px;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #eee;
  z-index: 10;
}

.edit-member-footer__btn {
  min-width: 160px;
  height: 44px;
  border-radius: 8px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.edit-member-footer__btn.is-primary {
  background: #1e3a8a;
  color: #fff;
}

.edit-member-footer__btn.is-danger {
  background: #fff;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.edit-member-footer__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.edit-member-land-dialog {
  max-height: 360px;
  overflow-y: auto;
}

.edit-member-land-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.edit-member-land-option__name {
  font-weight: 600;
  color: #111;
}

.edit-member-land-option__addr {
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

.edit-member-land-empty {
  padding: 24px;
  text-align: center;
  color: #999;
}
</style>
