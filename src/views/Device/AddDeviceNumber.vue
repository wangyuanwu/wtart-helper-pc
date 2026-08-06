<template>
  <div class="add-device-number">
    <header class="add-device-number__header">
      <button type="button" class="add-device-number__back" @click="onBack">
        ← 返回
      </button>
      <div class="add-device-number__heading">
        <h1 class="add-device-number__title">添加出水桩</h1>
        <p class="add-device-number__desc">
          可一次性输入多个设备ID，进行批量添加
        </p>
      </div>
    </header>

    <div class="add-device-number__panel">
      <button
        type="button"
        class="add-device-number__input-trigger"
        @click="openNumberDialog"
      >
        <span class="is-placeholder">输入设备编号</span>
      </button>
      <p class="add-device-number__hint">请输入设备 ID（11 位纯数字）</p>
    </div>

    <div v-if="!deviceList.length" class="add-device-number__empty">
      <img
        class="add-device-number__empty-img"
        :src="outletImg"
        alt=""
      />
    </div>

    <div v-else class="add-device-number__list">
      <div
        v-for="(item, index) in deviceList"
        :key="`${item.deviceCode}-${index}`"
        class="add-device-number__item"
      >
        <img class="add-device-number__item-img" :src="outletImg" alt="" />
        <div class="add-device-number__item-info">
          <div class="add-device-number__item-name">{{ item.name }}</div>
          <div class="add-device-number__item-code">{{ item.deviceCode }}</div>
        </div>
        <button
          type="button"
          class="add-device-number__item-del"
          title="删除"
          @click="removeDevice(index)"
        >
          <i class="iconfont icon-land_ic_dele"></i>
        </button>
        <el-checkbox v-model="item.isCheck" @change="syncCheckAll" />
      </div>
    </div>

    <footer class="add-device-number__footer">
      <el-checkbox v-model="isCheckAll" @change="onChangeAll">全选</el-checkbox>
      <div class="add-device-number__footer-spacer"></div>
      <el-button type="primary" @click="toDeviceLocation">
        下一步(设备定位)
      </el-button>
    </footer>

    <el-dialog
      v-model="numberDialogVisible"
      title="添加设备"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      @closed="resetNumberForm"
    >
      <el-form label-width="88px" @submit.prevent>
        <el-form-item label="设备ID">
          <el-input
            v-model="form.deviceCode"
            maxlength="11"
            placeholder="设备编号"
            clearable
          />
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input
            v-model="form.name"
            maxlength="32"
            placeholder="设备名称"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="numberDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="checking" @click="confirmNumber">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { addCheck } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import outletImg from '@/assets/device/add/device_img_outl.png'

const router = useRouter()
const farmStore = useFarmStore()

const deviceList = ref([])
const isCheckAll = ref(false)
const numberDialogVisible = ref(false)
const checking = ref(false)
const form = reactive({
  deviceCode: '',
  name: ''
})

const checkedCount = computed(
  () => deviceList.value.filter((d) => d.isCheck).length
)

function onBack() {
  router.back()
}

function openNumberDialog() {
  resetNumberForm()
  numberDialogVisible.value = true
}

function resetNumberForm() {
  form.deviceCode = ''
  form.name = ''
}

function syncCheckAll() {
  const list = deviceList.value
  isCheckAll.value = list.length > 0 && list.every((d) => d.isCheck)
}

function onChangeAll(val) {
  deviceList.value.forEach((item) => {
    item.isCheck = !!val
  })
}

function removeDevice(index) {
  deviceList.value.splice(index, 1)
  syncCheckAll()
}

async function confirmNumber() {
  const code = String(form.deviceCode || '').trim()
  const name = String(form.name || '').trim()
  const reg = /^\d{11}$/
  if (!reg.test(code)) {
    ElMessage.warning('设备编码必须是11位纯数字')
    return
  }
  if (!name) {
    ElMessage.warning('请输入设备名称')
    return
  }
  const exists = deviceList.value.some(
    (item) => String(item.deviceCode).trim() === code
  )
  if (exists) {
    ElMessage.warning('该设备编号已存在')
    return
  }

  const copyDevice = {
    deviceCode: code,
    name,
    isCheck: true
  }
  const type = code.slice(0, 2)
  checking.value = true
  try {
    await addCheck({
      name: copyDevice.name,
      deviceCode: code,
      type
    })
    deviceList.value.push(copyDevice)
    numberDialogVisible.value = false
    syncCheckAll()
  } catch (e) {
    console.error('[AddDeviceNumber] addCheck 失败', e)
    ElMessage.error('操作失败')
  } finally {
    checking.value = false
  }
}

/** 对齐移动端 toDeviceLocation → vuex_edit_device → add_device_location */
function toDeviceLocation() {
  if (!deviceList.value.length) {
    ElMessage.warning('请先添加设备')
    return
  }
  if (checkedCount.value <= 0) {
    ElMessage.warning('请勾选要添加的设备')
    return
  }
  const selected = deviceList.value
    .filter((d) => d.isCheck)
    .map((d) => ({
      deviceCode: d.deviceCode,
      name: d.name,
      isCheck: true
    }))
  farmStore.setEditDevice(selected)
  router.push('/device/add-location')
}
</script>

<style scoped>
.add-device-number {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
  box-sizing: border-box;
}

.add-device-number__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 28px 8px;
}

.add-device-number__back {
  border: none;
  background: transparent;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
}

.add-device-number__back:hover {
  color: #3653a0;
}

.add-device-number__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.add-device-number__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.add-device-number__desc {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #909399;
  line-height: 1.5;
}

.add-device-number__panel {
  margin: 12px 28px 0;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.add-device-number__input-trigger {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: #f5f7fa;
  text-align: left;
  padding: 0 16px;
  cursor: pointer;
}

.add-device-number__input-trigger .is-placeholder {
  color: #909399;
  font-size: 14px;
}

.add-device-number__hint {
  margin: 16px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.add-device-number__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.add-device-number__empty-img {
  width: 280px;
  height: 280px;
  object-fit: contain;
  opacity: 0.9;
}

.add-device-number__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin: 16px 28px 0;
  padding-bottom: 88px;
}

.add-device-number__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.add-device-number__item-img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.add-device-number__item-info {
  flex: 1;
  min-width: 0;
}

.add-device-number__item-name {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}

.add-device-number__item-code {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.add-device-number__item-del {
  border: none;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
}

.add-device-number__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 28px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.add-device-number__footer-spacer {
  flex: 1;
}
</style>
