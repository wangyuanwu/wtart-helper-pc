<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>个人信息</span>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="昵称">{{ userInfo.nickname || '--' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ userInfo.phoneNumber || '--' }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ userInfo.id ?? '--' }}</el-descriptions-item>
        <el-descriptions-item label="角色ID">{{ userInfo.roleId ?? '--' }}</el-descriptions-item>
        <el-descriptions-item label="头像">
          <el-avatar v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" :size="48" />
          <span v-else>--</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo || {})
</script>
