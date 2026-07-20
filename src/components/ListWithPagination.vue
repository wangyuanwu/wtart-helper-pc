<template>
  <div class="list-with-pagination">
    <div class="list-header">
      <slot name="header"></slot>
    </div>
    <div class="list-content">
      <slot name="content"></slot>
    </div>
    <div class="list-pagination">
      <el-pagination
        v-model:current-page="localCurrentPage"
        v-model:page-size="localPageSize"
        :page-sizes="pageSizes"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array, default: () => [10, 20, 50, 100] }
})

const emit = defineEmits(['update:currentPage', 'update:pageSize', 'size-change', 'current-change'])

const localCurrentPage = ref(props.currentPage)
const localPageSize = ref(props.pageSize)

watch(localCurrentPage, (value) => {
  emit('update:currentPage', value)
  emit('current-change', value)
})

watch(localPageSize, (value) => {
  emit('update:pageSize', value)
  emit('size-change', value)
})

watch(
  () => props.currentPage,
  (value) => {
    localCurrentPage.value = value
  }
)

watch(
  () => props.pageSize,
  (value) => {
    localPageSize.value = value
  }
)

const handleSizeChange = (size) => {
  localPageSize.value = size
}

const handleCurrentChange = (current) => {
  localCurrentPage.value = current
}
</script>

<style scoped>
.list-with-pagination {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.list-header {
  padding: 10px;
  flex-shrink: 0;
}

.list-content {
  flex: 1;
  overflow: auto;
}

.list-pagination {
  padding: 10px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
  margin-top: 10px;
}
</style>
