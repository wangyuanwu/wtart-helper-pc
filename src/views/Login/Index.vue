<template>
  <div class="login-container">
    <div class="bg-container">
      <div class="left-brand">
        <div class="brand-icon">水</div>
        <h1>水能手</h1>
        <p>智慧灌溉 · 设备监控 · 地图可视化</p>
      </div>

      <div class="login-card">
        <h3 class="welcome-title">欢迎登录水能手</h3>

        <el-form :model="form" :rules="rules" ref="formRef" label-width="0">
          <el-form-item prop="phoneNumber" class="form-item">
            <el-input
              v-model="form.phoneNumber"
              placeholder="手机号码"
              maxlength="11"
              class="login-input"
            />
          </el-form-item>

          <el-form-item prop="code" class="form-item">
            <div class="code-row">
              <el-input
                v-model="form.code"
                placeholder="验证码"
                maxlength="6"
                class="login-input"
                @keyup.enter="handleLogin"
              />
              <el-button
                type="success"
                plain
                :disabled="countdown > 0 || sendingCode"
                @click="handleSendCode"
              >
                {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item prop="isAgree" class="form-item agree-item">
            <el-checkbox v-model="form.isAgree">
              已阅读并同意
              <span class="link-text" @click.prevent="showAgreement('user')">《用户协议》</span>
              和
              <span class="link-text" @click.prevent="showAgreement('privacy')">《隐私政策》</span>
            </el-checkbox>
          </el-form-item>

          <el-form-item class="form-item">
            <el-button type="success" :loading="loggingIn" @click="handleLogin" class="login-btn">
              登录
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { login, sendCode } from '@/api'
import { useUserStore } from '@/store/user'

const router = useRouter()
const formRef = ref(null)
const userStore = useUserStore()
const countdown = ref(0)
const sendingCode = ref(false)
const loggingIn = ref(false)
let countdownTimer = null

const form = ref({
  phoneNumber: '',
  code: '',
  isAgree: false
})

const validatePhone = (rule, value, callback) => {
  if (!value) return callback(new Error('请输入手机号码'))
  if (!/^1\d{10}$/.test(value)) return callback(new Error('请输入正确的手机号码'))
  callback()
}

const validateAgree = (rule, value, callback) => {
  if (!value) return callback(new Error('请阅读并同意用户协议和隐私政策'))
  callback()
}

const rules = {
  phoneNumber: [{ validator: validatePhone, trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  isAgree: [{ validator: validateAgree, trigger: 'change' }]
}

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

const handleSendCode = async () => {
  try {
    await formRef.value.validateField('phoneNumber')
  } catch (e) {
    return
  }

  sendingCode.value = true
  try {
    await sendCode({ phoneNumber: form.value.phoneNumber })
    ElMessage.success('验证码已发送')
    startCountdown()
  } catch (e) {
    // 错误由 request 拦截器提示
  } finally {
    sendingCode.value = false
  }
}

const handleLogin = async () => {
  await formRef.value.validate()
  loggingIn.value = true
  try {
    const res = await login({
      phoneNumber: form.value.phoneNumber,
      code: form.value.code
    })

    const accessToken = res.data?.accessToken || ''
    const refreshTokenValue = res.data?.refreshToken || ''
    const userInfo = {
      phone: form.value.phoneNumber,
      ...(res.data?.userInfo || {})
    }

    userStore.setAuth({
      accessToken,
      refreshToken: refreshTokenValue
    })
    userStore.setUserInfo(userInfo)
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshTokenValue)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))

    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    userStore.logOut()
  } finally {
    loggingIn.value = false
  }
}

const showAgreement = (type) => {
  const title = type === 'user' ? '用户协议' : '隐私政策'
  ElMessageBox.alert(`请在移动端查看${title}完整内容。`, title, {
    confirmButtonText: '我知道了',
    type: 'info'
  })
}

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped>
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #2d8f47 0%, #3aa858 50%, #5bc47a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-container {
  width: 100%;
  max-width: 1100px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 50px;
  gap: 40px;
}

.left-brand {
  flex: 1;
  color: #fff;
}

.brand-icon {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 24px;
}

.left-brand h1 {
  font-size: 32px;
  margin-bottom: 12px;
}

.left-brand p {
  font-size: 16px;
  opacity: 0.9;
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 28px;
  text-align: center;
}

.form-item {
  margin-bottom: 20px;
}

.login-input {
  width: 100%;
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row .login-input {
  flex: 1;
}

.agree-item {
  margin-bottom: 8px;
}

.link-text {
  color: var(--primary-color);
  cursor: pointer;
}

.login-btn {
  width: 100%;
  height: 42px;
  font-size: 16px;
}

@media (max-width: 768px) {
  .bg-container {
    flex-direction: column;
    padding: 20px;
  }

  .left-brand {
    text-align: center;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
  }
}
</style>
