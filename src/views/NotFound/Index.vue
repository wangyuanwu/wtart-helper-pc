<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="not-found-icon">404</div>
      <h1>页面不存在</h1>
      <p>您访问的页面不存在或已被删除</p>
      <el-button type="success" @click="goBack">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/map')
}
</script>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.not-found-content {
  text-align: center;
  padding: 60px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.not-found-icon {
  font-size: 96px;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 20px;
}

h1 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 10px;
}

p {
  color: #606266;
  margin-bottom: 30px;
}
</style>
