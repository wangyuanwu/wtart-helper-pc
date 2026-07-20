<template>
  <div class="login-container">
    <div class="login-card">
      <h3 class="welcome-title">密码修改</h3>
      <p class="tip">移动端暂未提供 PC 端密码重置接口，如需修改密码请使用手机 App 或联系管理员。</p>
      <el-button type="success" class="login-btn" @click="goBack">返回登录</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/login')
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #2d8f47 0%, #3aa858 50%, #5bc47a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.tip {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  height: 42px;
}
</style>
