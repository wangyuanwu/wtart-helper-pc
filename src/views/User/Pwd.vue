<template>
  <div class="page-container">
    <el-card :style="{ maxWidth: px2rem(520) }">
      <template #header>
        <span>修改密码</span>
      </template>
      <el-empty description="请使用手机 App 修改密码，PC 端暂不支持该功能" />
    </el-card>
  </div>
</template>

<script setup>
import { px2rem } from '@/utils/rem'
</script>
