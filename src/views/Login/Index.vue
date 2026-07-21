<template>
  <div class="login-page">
    <h1 class="page-slogan">用上水能手 灌溉好帮手</h1>

    <div class="login-card">
      <div class="login-tabs">
        <button
          type="button"
          class="login-tab"
          :class="{ active: activeTab === 'code' }"
          @click="switchTab('code')"
        >
          验证码登录
        </button>
        <button
          type="button"
          class="login-tab"
          :class="{ active: activeTab === 'qrcode' }"
          @click="switchTab('qrcode')"
        >
          扫码登录
        </button>
      </div>

      <div class="login-body">
        <el-form
          v-if="activeTab === 'code'"
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="0"
          class="code-form"
        >
          <el-form-item prop="phoneNumber" class="form-item">
            <el-input
              v-model="form.phoneNumber"
              placeholder="手机号"
              maxlength="11"
              class="login-field"
            />
          </el-form-item>

          <el-form-item prop="code" class="form-item">
            <div class="code-field">
              <el-input
                v-model="form.code"
                placeholder="验证码"
                maxlength="6"
                class="login-field code-input"
                @keyup.enter="handleLogin"
              />
              <button
                type="button"
                class="send-code-btn"
                :disabled="countdown > 0 || sendingCode"
                @click="handleSendCode"
              >
                {{ countdown > 0 ? `${countdown}s 后重发` : '获取短信验证码' }}
              </button>
            </div>
          </el-form-item>

          <div class="submit-wrap">
            <el-button
              type="primary"
              class="submit-btn"
              :loading="loggingIn"
              @click="handleLogin"
            >
              登录
            </el-button>
          </div>
        </el-form>

        <div v-else class="qrcode-panel">
          <div class="qrcode-box" @click="handleQrcodeClick">
            <img
              v-if="qrcodeUrl"
              :src="qrcodeUrl"
              alt="扫码登录"
              class="qrcode-image"
            />
            <div v-else class="qrcode-loading">二维码加载中...</div>
          </div>
          <p class="qrcode-tip">水能手APP扫一扫</p>
        </div>
      </div>

      <div class="login-footer">
        <img :src="arcBgUrl" alt="" class="arc-bg" />
        <div class="brand-text">水 能 手</div>
      </div>
    </div>

    <div class="page-footer">
      <p class="footer-tip">新用户可直接登录，注册登录即代表同意</p>
      <p class="footer-links">
        <span>用户服务</span>
        <span class="divider">|</span>
        <span>协议隐私</span>
        <span class="divider">|</span>
        <span>政策会员</span>
        <span class="divider">|</span>
        <span>服务协议</span>
        <span class="divider">|</span>
        <span>授权许可协议</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, sendCode, getUser } from '@/api'
import { useUserStore } from '@/store/user'
import arcBgUrl from '@/assets/login/arc-bg.png'

const QRCODE_API = 'https://api.qrserver.com/v1/create-qr-code/'

const router = useRouter()
const formRef = ref(null)
const userStore = useUserStore()
const activeTab = ref('code')
const countdown = ref(0)
const sendingCode = ref(false)
const loggingIn = ref(false)
const qrcodeUrl = ref('')
let countdownTimer = null

const form = ref({
  phoneNumber: '',
  code: ''
})

const validatePhone = (rule, value, callback) => {
  if (!value) return callback(new Error('请输入手机号码'))
  if (!/^1\d{10}$/.test(value)) return callback(new Error('请输入正确的手机号码'))
  callback()
}

const rules = {
  phoneNumber: [{ validator: validatePhone, trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const generateQrcode = () => {
  const payload = `wtart-pc-login:${Date.now()}`
  qrcodeUrl.value = `${QRCODE_API}?size=200x200&data=${encodeURIComponent(payload)}`
}

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'qrcode') {
    generateQrcode()
  }
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

    userStore.setAuth({
      accessToken,
      refreshToken: refreshTokenValue
    })
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshTokenValue)

    const userRes = await getUser()
    userStore.setUserInfo(userRes.data || {})

    ElMessage.success('登录成功')
    router.push('/map')
  } catch (e) {
    userStore.logOut()
  } finally {
    loggingIn.value = false
  }
}

const handleQrcodeClick = () => {
  ElMessage.info('研发中')
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px 32px;
  background: linear-gradient(180deg, #eef2fa 0%, #e3eaf6 50%, #d9e2f2 100%);
}

.page-slogan {
  margin: 0 0 36px;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  letter-spacing: 1px;
}

.login-card {
  width: 480px;
  background: #fff;
  border-radius: 32px;
  border: 2px solid #3d5a9a;
  box-shadow: 0 6px 24px rgba(61, 90, 154, 0.12);
  overflow: hidden;
}

.login-tabs {
  display: flex;
  justify-content: center;
  gap: 56px;
  padding: 32px 24px 0;
}

.login-tab {
  position: relative;
  border: none;
  background: transparent;
  padding: 0 0 12px;
  font-size: 18px;
  color: #8a96a8;
  cursor: pointer;
  transition: color 0.2s;
}

.login-tab.active {
  color: #334d8c;
  font-weight: 600;
}

.login-tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: #334d8c;
}

.login-body {
  height: 280px;
  padding: 28px 40px 16px;
  box-sizing: border-box;
}

.form-item {
  margin-bottom: 20px;
  width: 100%;
}

.code-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.code-form :deep(.el-form-item) {
  width: 100%;
  margin-bottom: 20px;
}

.code-form :deep(.el-form-item__content) {
  width: 100%;
  line-height: normal;
}

.code-form :deep(.el-form-item__error) {
  padding-top: 4px;
}

.login-field {
  width: 100%;
}

.login-field :deep(.el-input) {
  width: 100%;
}

.login-field :deep(.el-input__wrapper) {
  min-height: 48px;
  padding: 0 16px;
  border-radius: 8px;
  background: #eef0f4;
  box-shadow: none;
  border: none;
}

.login-field :deep(.el-input__inner) {
  font-size: 16px;
  color: #333;
}

.login-field :deep(.el-input__inner::placeholder) {
  color: #b0b5bf;
}

.code-field {
  position: relative;
  width: 100%;
}

.code-input :deep(.el-input__wrapper) {
  padding-right: 130px;
}

.send-code-btn {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #334d8c;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.send-code-btn:disabled {
  color: #a0a7b4;
  cursor: not-allowed;
}

.submit-wrap {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
}

.submit-btn {
  width: 200px;
  height: 48px;
  border: none;
  border-radius: 8px;
  background: #334d8c;
  font-size: 18px;
  font-weight: 500;
}

.submit-btn:hover,
.submit-btn:focus {
  background: #2a4075;
}

.qrcode-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.qrcode-box {
  width: 200px;
  height: 200px;
  padding: 6px;
  border: 1px solid #e4e6ea;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.qrcode-box:hover {
  box-shadow: 0 2px 12px rgba(51, 77, 140, 0.15);
}

.qrcode-image {
  width: 100%;
  height: 100%;
  display: block;
}

.qrcode-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.qrcode-tip {
  margin: 16px 0 0;
  font-size: 16px;
  color: #666;
}

.login-footer {
  position: relative;
  height: 110px;
  margin: 0 -2px -2px;
  width: calc(100% + 4px);
  overflow: hidden;
}

.arc-bg {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 106%;
  height: 100%;
  transform: translateX(-50%);
  object-fit: fill;
  display: block;
  pointer-events: none;
}

.brand-text {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 14px;
  white-space: nowrap;
  pointer-events: none;
}

.page-footer {
  margin-top: 28px;
  text-align: center;
  color: #999;
  font-size: 13px;
  line-height: 1.8;
}

.footer-tip {
  margin: 0;
}

.footer-links {
  margin: 4px 0 0;
}

.footer-links .divider {
  margin: 0 8px;
  color: #ccc;
}

@media (max-width: 768px) {
  .page-slogan {
    font-size: 22px;
    margin-bottom: 24px;
  }

  .login-card {
    width: 100%;
    max-width: 480px;
    border-radius: 24px;
  }

  .login-body {
    height: 280px;
    padding: 24px 24px 12px;
  }

  .login-tabs {
    gap: 36px;
  }
}
</style>
