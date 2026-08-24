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
          label-position="top"
          class="code-form"
        >
          <div class="code-form-fields">
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
          </div>
        </el-form>

        <div v-else class="qrcode-panel">
          <div
            class="qrcode-box"
            :class="{ 'is-expired': qrcodeStatus === 'expired' }"
            @click="handleQrcodeRefresh"
          >
            <img
              v-if="qrcodeUrl && !qrcodeLoading"
              :src="qrcodeUrl"
              alt="扫码登录"
              class="qrcode-image"
              :class="{ 'is-dimmed': qrcodeStatus === 'expired' }"
            />
            <div v-else class="qrcode-loading">二维码加载中...</div>
            <div v-if="qrcodeStatus === 'expired'" class="qrcode-mask">
              <span class="qrcode-mask__title">二维码已过期</span>
              <span class="qrcode-mask__action">点击刷新</span>
            </div>
          </div>
          <p class="qrcode-tip">{{ qrcodeTipText }}</p>
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
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import {
  login,
  sendCode,
  getUser,
  createQrLoginTicket,
  getQrLoginStatus
} from '@/api'
import { useUserStore } from '@/store/user'
import arcBgUrl from '@/assets/login/arc-bg.png'

const QR_POLL_MS = 2000
const QR_DEFAULT_EXPIRE_SEC = 120

const router = useRouter()
const formRef = ref(null)
const userStore = useUserStore()
const activeTab = ref('code')
const countdown = ref(0)
const sendingCode = ref(false)
const loggingIn = ref(false)
const qrcodeUrl = ref('')
const qrcodeLoading = ref(false)
const qrcodeLoggingIn = ref(false)
/** pending | scanned | confirmed | expired */
const qrcodeStatus = ref('pending')

let countdownTimer = null
let qrPollTimer = null
let qrExpireTimer = null
let qrPollBusy = false
let qrTicket = ''

const form = ref({
  phoneNumber: '',
  code: ''
})

const qrcodeTipText = computed(() => {
  if (qrcodeStatus.value === 'scanned') {
    return '扫码成功，请在手机上确认登录'
  }
  if (qrcodeStatus.value === 'expired') {
    return '二维码已过期，点击二维码刷新'
  }
  return '水能手APP扫一扫'
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

/** 用接口返回的 qrCodeContent 生成二维码图片 */
async function renderQrcodeImage(qrCodeContent) {
  const content = String(qrCodeContent || '').trim()
  if (!content) throw new Error('二维码内容为空')
  qrcodeUrl.value = await QRCode.toDataURL(content, {
    width: 188,
    margin: 1,
    errorCorrectionLevel: 'M'
  })
}

/** 将接口 status（数字或字符串）归一为 pending|scanned|confirmed|expired */
function normalizeQrStatus(raw) {
  if (raw == null || raw === '') return 'pending'
  if (typeof raw === 'number' || /^\d+$/.test(String(raw))) {
    const map = {
      0: 'pending',
      1: 'scanned',
      2: 'confirmed',
      3: 'expired'
    }
    return map[Number(raw)] || 'pending'
  }
  const text = String(raw).toLowerCase()
  if (['pending', 'scanned', 'confirmed', 'expired'].includes(text)) {
    return text
  }
  return 'pending'
}

function clearQrTimers() {
  if (qrPollTimer) {
    clearInterval(qrPollTimer)
    qrPollTimer = null
  }
  if (qrExpireTimer) {
    clearTimeout(qrExpireTimer)
    qrExpireTimer = null
  }
  qrPollBusy = false
}

function stopQrLogin() {
  clearQrTimers()
  qrTicket = ''
}

/** 登录成功后的统一处理（验证码 / 扫码共用） */
async function applyLoginSuccess(tokenData) {
  const accessToken = tokenData?.accessToken || ''
  const refreshTokenValue = tokenData?.refreshToken || ''
  if (!accessToken) {
    ElMessage.error('登录失败')
    return false
  }

  userStore.setAuth({
    accessToken,
    refreshToken: refreshTokenValue
  })
  localStorage.setItem('token', accessToken)
  localStorage.setItem('refreshToken', refreshTokenValue)

  const userRes = await getUser()
  userStore.setUserInfo(userRes.data || {})

  ElMessage.success('登录成功')
  stopQrLogin()
  router.push('/map')
  return true
}

async function initQrLogin() {
  stopQrLogin()
  qrcodeUrl.value = ''
  qrcodeStatus.value = 'pending'
  qrcodeLoading.value = true

  try {
    const res = await createQrLoginTicket()
    const data = res?.data || {}
    const ticket = data.ticket || ''
    const qrCodeContent = data.qrCodeContent || ''
    if (!ticket || !qrCodeContent) {
      ElMessage.error('获取登录二维码失败')
      return
    }

    qrTicket = ticket
    await renderQrcodeImage(qrCodeContent)

    const expireSec = Number(data.expireSeconds ?? QR_DEFAULT_EXPIRE_SEC)
    startQrExpireTimer(expireSec)
    startQrPoll()
  } catch (e) {
    console.error('[Login] 创建扫码二维码失败', e)
    ElMessage.error(e?.message || '获取登录二维码失败')
  } finally {
    qrcodeLoading.value = false
  }
}

function startQrExpireTimer(seconds) {
  if (qrExpireTimer) clearTimeout(qrExpireTimer)
  const ms = Math.max(Number(seconds) || QR_DEFAULT_EXPIRE_SEC, 1) * 1000
  qrExpireTimer = setTimeout(() => {
    if (qrcodeStatus.value !== 'confirmed') {
      qrcodeStatus.value = 'expired'
      clearQrTimers()
    }
  }, ms)
}

async function pollQrStatusOnce() {
  if (
    qrPollBusy ||
    !qrTicket ||
    qrcodeStatus.value === 'expired' ||
    qrcodeLoggingIn.value
  ) {
    return
  }

  qrPollBusy = true
  try {
    const res = await getQrLoginStatus(qrTicket)
    const data = res?.data || {}
    const status = normalizeQrStatus(data.status)

    if (status === 'pending') {
      qrcodeStatus.value = 'pending'
      return
    }

    if (status === 'scanned') {
      qrcodeStatus.value = 'scanned'
      return
    }

    if (status === 'expired') {
      qrcodeStatus.value = 'expired'
      clearQrTimers()
      return
    }

    if (status === 'confirmed') {
      qrcodeStatus.value = 'confirmed'
      clearQrTimers()
      qrcodeLoggingIn.value = true
      try {
        await applyLoginSuccess(data)
      } catch (e) {
        userStore.logOut()
        qrcodeStatus.value = 'pending'
        await initQrLogin()
      } finally {
        qrcodeLoggingIn.value = false
      }
    }
  } catch (e) {
    // 轮询静默失败，不打断用户操作
  } finally {
    qrPollBusy = false
  }
}

function startQrPoll() {
  if (qrPollTimer) clearInterval(qrPollTimer)
  pollQrStatusOnce()
  qrPollTimer = setInterval(pollQrStatusOnce, QR_POLL_MS)
}

function handleQrcodeRefresh() {
  if (qrcodeLoading.value || qrcodeLoggingIn.value) return
  if (qrcodeStatus.value === 'expired' || !qrcodeUrl.value) {
    initQrLogin()
  }
}

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'qrcode') {
    initQrLogin()
  } else {
    stopQrLogin()
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
    await applyLoginSuccess(res.data || {})
  } catch (e) {
    userStore.logOut()
  } finally {
    loggingIn.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  stopQrLogin()
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
  width: 778px;
  height: 478px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 52px;
  border: 4px solid #3d5a9a;
  box-shadow: 0 6px 24px rgba(61, 90, 154, 0.12);
  overflow: hidden;
  flex-shrink: 0;
}

.login-tabs {
  display: flex;
  justify-content: center;
  gap: 91px;
  flex-shrink: 0;
  padding: 34px 39px 0;
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
  flex: 1;
  min-height: 0;
  padding: 29px 65px 17px;
  box-sizing: border-box;
}

.code-form {
  height: 100%;
  width: 100%;
}

.code-form-fields {
  width: 336px;
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}

.code-form-fields :deep(.el-form-item) {
  width: 100%;
  margin: 0 0 20px;
  display: block;
}

.code-form-fields :deep(.el-form-item__label) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.code-form-fields :deep(.el-form-item__content) {
  width: 100% !important;
  margin-left: 0 !important;
  line-height: normal;
  flex: none;
  display: block;
}

.code-form-fields :deep(.el-form-item__error) {
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
  width: 100%;
  padding-top: 8px;
}

.submit-btn {
  width: 100%;
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
  position: relative;
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

.qrcode-box.is-expired {
  cursor: pointer;
}

.qrcode-image {
  width: 100%;
  height: 100%;
  display: block;
}

.qrcode-image.is-dimmed {
  opacity: 0.25;
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

.qrcode-mask {
  position: absolute;
  inset: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 4px;
}

.qrcode-mask__title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.qrcode-mask__action {
  font-size: 13px;
  color: #3653a0;
}

.qrcode-tip {
  margin: 16px 0 0;
  font-size: 16px;
  color: #666;
  text-align: center;
}

.login-footer {
  position: relative;
  flex-shrink: 0;
  height: 116px;
  margin: 0 -4px -4px;
  width: calc(100% + 8px);
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
    width: calc(100vw - 40px);
    max-width: 778px;
    height: auto;
    aspect-ratio: 778 / 478;
    border-radius: 40px;
  }

  .login-body {
    padding: 24px 32px 12px;
  }

  .login-tabs {
    gap: 48px;
    padding: 28px 24px 0;
  }

  .code-form-fields {
    width: 100%;
    max-width: 336px;
  }
}
</style>
