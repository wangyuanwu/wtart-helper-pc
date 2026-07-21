<template>
  <div class="h-full bg-white flex flex-col px-5 py-5">
    <el-card class="flex-1">
      <ListWithPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
      >
        <template #header>
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <el-input
              v-model="keyword"
              placeholder="搜索轮灌组名称"
              clearable
              :style="{ width: px2rem(260) }"
            />
            <el-button type="success">新增轮灌组</el-button>
          </div>
        </template>
        <template #content>
          <el-table :data="tableData" stripe style="width: 100%">
            <el-table-column prop="name" label="轮灌组名称" min-width="160" />
            <el-table-column prop="landName" label="所属地块" min-width="140" />
            <el-table-column prop="deviceCount" label="设备数量" min-width="100" />
            <el-table-column prop="status" label="状态" min-width="100" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default>
                <el-button type="primary" link>详情</el-button>
                <el-button type="primary" link>编辑</el-button>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!tableData.length" description="功能开发中，暂无数据" />
        </template>
      </ListWithPagination>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ListWithPagination from '@/components/ListWithPagination.vue'
import { px2rem } from '@/utils/rem'

const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
</script>
