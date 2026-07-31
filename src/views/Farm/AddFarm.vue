<template>
  <div class="add-farm-page">
    <div class="add-farm-header">
      <button type="button" class="add-farm-back" @click="onBack">← 返回</button>
      <h2 class="add-farm-title">新建农场</h2>
    </div>

    <div v-if="!isOk" class="add-farm-body">
      <div class="add-farm-card">
        <div class="add-farm-row">
          <label class="add-farm-label">农场名称</label>
          <div class="add-farm-input-wrap">
            <input
              v-model="farmName"
              class="add-farm-input"
              type="text"
              placeholder="请输入农场名称"
              maxlength="50"
            />
            <button
              v-if="farmName"
              type="button"
              class="add-farm-clear"
              @click="farmName = ''"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="add-farm-row">
          <label class="add-farm-label">农场地址</label>
          <p class="add-farm-address">
            {{ farmStore.s_location?.address || '请重新选择农场地址' }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="add-farm-save"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <div v-else class="add-farm-success">
      <div class="add-farm-success__card">
        <p class="add-farm-success__title">新建成功!</p>
        <p class="add-farm-success__desc">即将返回首页</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import { useUserStore } from '@/store/user'
import { addFarm } from '@/api/map'

const router = useRouter()
const farmStore = useFarmStore()
const userStore = useUserStore()

const farmName = ref('')
const isOk = ref(false)
const saving = ref(false)

const onBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/map/chose-farm?type=add')
  }
}

const onSave = async () => {
  const name = farmName.value.trim()
  if (!name) {
    ElMessage.warning('请输入农场名称')
    return
  }
  const location = farmStore.s_location
  if (!location?.lng || !location?.lat) {
    ElMessage.warning('请重新选择农场地址')
    return
  }

  saving.value = true
  try {
    const res = await addFarm({
      userId: userStore.userInfo?.id ?? userStore.userInfo?.userId ?? 0,
      name,
      address: location.address,
      longitude: location.lng,
      latitude: location.lat
    })
    if (res?.code === 200) {
      isOk.value = true
      ElMessage.success('操作成功,即将返回首页')
      setTimeout(async () => {
        try {
          await farmStore.fetchFarmList()
        } catch (e) {
          console.error('[AddFarm] 刷新农场列表失败', e)
        }
        router.replace('/map')
      }, 2000)
    }
  } catch (e) {
    console.error('[AddFarm] 新建农场失败', e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (!farmStore.s_location?.lng) {
    ElMessage.warning('请先选择农场地址')
    router.replace('/map/chose-farm?type=add')
  }
})
</script>

<style scoped>
.add-farm-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #f7fafc;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.add-farm-header {
  flex-shrink: 0;
  height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.add-farm-back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.add-farm-title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #0f172a;
}

.add-farm-body {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.add-farm-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px 20px;
  box-shadow: 0 2px 10px rgba(31, 45, 61, 0.06);
}

.add-farm-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.add-farm-row + .add-farm-row {
  margin-top: 28px;
}

.add-farm-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 14px;
  color: #909399;
  line-height: 40px;
}

.add-farm-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  background: #f7fafc;
}

.add-farm-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: #0f172a;
}

.add-farm-clear {
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  font-size: 14px;
}

.add-farm-address {
  flex: 1;
  margin: 0;
  padding-top: 10px;
  font-size: 15px;
  color: #0f172a;
  line-height: 1.5;
  word-break: break-all;
}

.add-farm-save {
  margin: 48px auto 0;
  width: 220px;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #3653a0;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.add-farm-save:hover:not(:disabled) {
  background: #2f4a90;
}

.add-farm-save:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.add-farm-success {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.add-farm-success__card {
  width: 100%;
  max-width: 420px;
  min-height: 280px;
  border-radius: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(31, 45, 61, 0.06);
}

.add-farm-success__title {
  margin: 0;
  font-size: 22px;
  font-weight: bold;
  color: #0f172a;
}

.add-farm-success__desc {
  margin: 12px 0 0;
  font-size: 14px;
  color: #909399;
}
</style>
