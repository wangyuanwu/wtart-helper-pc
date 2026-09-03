<template>
  <el-dialog
    v-model="visible"
    title="选择轮灌步骤"
    width="520px"
    append-to-body
    :close-on-click-modal="false"
    class="group-chose-dialog"
  >
    <div class="group-chose-dialog__tabs">
      <button
        type="button"
        class="group-chose-dialog__tab"
        :class="{ 'is-active': choseIndex === 0 }"
        @click="choseIndex = 0"
      >
        阀门组
      </button>
      <button
        type="button"
        class="group-chose-dialog__tab"
        :class="{ 'is-active': choseIndex === 1 }"
        @click="choseIndex = 1"
      >
        阀门
      </button>
    </div>

    <div v-if="!filteredList.length" class="group-chose-dialog__empty">
      {{ choseIndex === 0 ? '暂无可选阀门组' : '暂无可选阀门' }}
    </div>
    <div v-else class="group-chose-dialog__list">
      <label
        v-for="item in filteredList"
        :key="`${item.stepType}-${item.id}`"
        class="group-chose-dialog__item"
        @click.prevent="toggleCheck(item)"
      >
        <el-checkbox :model-value="!!item.isChose" @click.stop.prevent="toggleCheck(item)" />
        <div class="group-chose-dialog__item-main">
          <span
            class="group-chose-dialog__item-name"
            :class="{ 'is-checked': item.isChose }"
          >
            {{ item.name }}
          </span>
          <span class="group-chose-dialog__item-type">
            {{ item.stepType === 0 ? '阀门组' : '阀门' }}
          </span>
        </div>
      </label>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="confirmSelect">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 轮灌步骤选择（阀门组 / 阀门）
 * 对齐移动端 pop_group_chose：双 Tab，按 id + stepType 回显
 */
import { computed, ref } from 'vue'

const emit = defineEmits(['confirm'])

const visible = ref(false)
const choseIndex = ref(0)
const irrigationList = ref([])

const filteredList = computed(() =>
  irrigationList.value.filter((item) => Number(item.stepType) === choseIndex.value)
)

function toggleCheck(item) {
  item.isChose = !item.isChose
}

/**
 * @param {Array} list step-items 转换后的完整可选列表
 * @param {Array} selectedList 已选步骤（含 id + stepType）
 */
function open(list = [], selectedList = []) {
  choseIndex.value = 0
  const selected = Array.isArray(selectedList) ? selectedList : []
  irrigationList.value = (Array.isArray(list) ? list : []).map((item) => {
    const matched = selected.find(
      (s) =>
        String(s.id) === String(item.id) &&
        Number(s.stepType) === Number(item.stepType)
    )
    return {
      ...item,
      isChose: !!matched
    }
  })
  visible.value = true
}

function confirmSelect() {
  const result = irrigationList.value
    .filter((item) => item.isChose)
    .map(({ isChose, ...rest }) => rest)
  emit('confirm', result)
  visible.value = false
}

defineExpose({ open })
</script>

<style scoped>
.group-chose-dialog__tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.group-chose-dialog__tab {
  flex: 1;
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.group-chose-dialog__tab.is-active {
  border-color: #3653a0;
  background: #3653a0;
  color: #fff;
}

.group-chose-dialog__empty {
  padding: 32px 16px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.group-chose-dialog__list {
  display: flex;
  flex-direction: column;
  max-height: 400px;
  overflow: auto;
}

.group-chose-dialog__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 4px;
  border-bottom: 1px solid #edf1f7;
  cursor: pointer;
}

.group-chose-dialog__item:last-child {
  border-bottom: none;
}

.group-chose-dialog__item-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-chose-dialog__item-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
}

.group-chose-dialog__item-name.is-checked {
  color: #3653a0;
}

.group-chose-dialog__item-type {
  font-size: 12px;
  color: #909399;
}
</style>
