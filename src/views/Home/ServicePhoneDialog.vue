<template>
  <el-dialog
    v-model="visible"
    width="360px"
    align-center
    :show-close="true"
    :append-to-body="true"
    class="service-phone-dialog"
    modal-class="service-phone-dialog-modal"
  >
    <div class="service-phone">
      <div class="service-phone__head">
        <img class="service-phone__head-img" :src="iconHead" alt="" />
        <div class="service-phone__title">联系客服</div>
        <div class="service-phone__number">{{ displayPhone }}</div>
      </div>

      <img class="service-phone__divider" :src="iconBg" alt="" />

      <div class="service-phone__body">
        <p class="service-phone__address">地址:{{ address }}</p>
        <button
          type="button"
          class="service-phone__nav"
          :disabled="navigating"
          @click="toLocation"
        >
          <img class="service-phone__nav-icon" :src="iconNav" alt="" />
          <span>{{ navigating ? '定位中...' : '导航' }}</span>
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
/**
 * 联系客服弹窗
 * 对齐移动端 pages/home/popup/pop_phone.vue（PC 去掉拨打，导航带起点定位）
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import iconHead from '@/assets/phone/icon2_head.png'
import iconBg from '@/assets/phone/icon2_bg.png'
import iconNav from '@/assets/phone/icon2_dh.png'

const SERVICE_PHONE_DISPLAY = '158-8217-9561'
const SERVICE_LAT = 30.782533
const SERVICE_LNG = 103.844676
const SERVICE_NAME = '成都智棚农业科技有限公司'
const SERVICE_ADDRESS =
  '四川省成都市郫都区德源街道苏试试验成都实验室西南135米'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const displayPhone = SERVICE_PHONE_DISPLAY
const address = SERVICE_ADDRESS
const navigating = ref(false)

function openNaviUrl(fromLng, fromLat) {
  const fromName = encodeURIComponent('我的位置')
  const toName = encodeURIComponent(SERVICE_NAME)
  const from = `${fromLng},${fromLat},${fromName}`
  const to = `${SERVICE_LNG},${SERVICE_LAT},${toName}`
  const webUrl =
    `https://uri.amap.com/navigation?from=${from}&to=${to}` +
    '&mode=car&coordinate=gaode&callnative=0'
  window.open(webUrl, '_blank')
}

/** 优先高德 Geolocation（GCJ-02），失败再兜底浏览器定位 */
function getCurrentLngLat() {
  return new Promise((resolve, reject) => {
    if (typeof window.AMap !== 'undefined') {
      window.AMap.plugin('AMap.Geolocation', () => {
        const geo = new window.AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 12000,
          convert: true,
          showButton: false,
          showMarker: false,
          showCircle: false
        })
        geo.getCurrentPosition((status, result) => {
          if (status === 'complete' && result?.position) {
            const lng = result.position.lng ?? result.position.getLng?.()
            const lat = result.position.lat ?? result.position.getLat?.()
            if (lng != null && lat != null) {
              resolve({ lng: Number(lng), lat: Number(lat) })
              return
            }
          }
          reject(new Error(result?.message || '定位失败'))
        })
      })
      return
    }

    if (!navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude
        })
      },
      (err) => reject(err || new Error('定位失败')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  })
}

/** 获取当前位置后导航到公司地址 */
async function toLocation() {
  if (navigating.value) return
  navigating.value = true
  try {
    const { lng, lat } = await getCurrentLngLat()
    openNaviUrl(lng, lat)
  } catch (e) {
    console.error('[ServicePhone] 定位失败', e)
    ElMessage.error('定位失败，请检查浏览器定位权限')
  } finally {
    navigating.value = false
  }
}
</script>

<style scoped>
.service-phone {
  padding: 8px 0 4px;
}

.service-phone__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px 12px;
}

.service-phone__head-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.service-phone__title {
  margin-top: 10px;
  font-size: 15px;
  color: #303133;
}

.service-phone__number {
  margin-top: 10px;
  font-size: 26px;
  font-weight: 700;
  color: #3653a0;
  letter-spacing: 0.5px;
}

.service-phone__divider {
  display: block;
  width: 100%;
  height: 30px;
  object-fit: cover;
}

.service-phone__body {
  position: relative;
  padding: 16px 20px 12px;
}

.service-phone__address {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  padding-right: 64px;
}

.service-phone__nav {
  position: absolute;
  right: 20px;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.service-phone__nav:hover:not(:disabled) {
  opacity: 0.85;
}

.service-phone__nav:disabled {
  opacity: 0.6;
  cursor: wait;
}

.service-phone__nav-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
</style>

<style>
.service-phone-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.service-phone-dialog .el-dialog__header {
  padding: 12px 16px 0;
  margin: 0;
}

.service-phone-dialog .el-dialog__body {
  padding: 0 0 8px;
}
</style>
