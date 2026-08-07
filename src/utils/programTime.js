const pad2 = (n) => String(n).padStart(2, '0')

/** 秒 → HH:mm:ss，对齐移动端 second2Time */
export function second2Time(value) {
  let sec = parseInt(value, 10) || 0
  let m = 0
  let h = 0
  if (sec >= 60) {
    m = Math.floor(sec / 60)
    sec %= 60
    if (m >= 60) {
      h = Math.floor(m / 60)
      m %= 60
    }
  }
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`
}

/** HH:mm:ss → 秒 */
export function time2Second(timeStr) {
  if (!timeStr) return 0
  const parts = String(timeStr).split(':').map((v) => parseInt(v, 10) || 0)
  if (parts.length >= 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return 0
}

export function getNowDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function getNowTimeStr() {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export function getDateOffsetStr(dateStr, offsetDays) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 设计稿友好展示：1小时4分钟 */
export function formatDurationFriendly(seconds) {
  const sec = parseInt(seconds, 10) || 0
  if (sec <= 0) return '请设置时长'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts = []
  if (h > 0) parts.push(`${h}小时`)
  if (m > 0) parts.push(`${m}分钟`)
  if (s > 0 && h === 0 && m === 0) parts.push(`${s}秒`)
  return parts.join('') || '0秒'
}

export function createDefaultProInfo(farmId) {
  const nowDate = getNowDateStr()
  const nowTime = getNowTimeStr()
  return {
    name: '',
    farmId,
    landId: undefined,
    rotationCount: 1,
    intervalSeconds: 0,
    keepOneRunning: true,
    startCondition: 0,
    isGroupParametersSame: true,
    enabled: true,
    groups: [],
    timerTaskConfig: {
      id: 0,
      timerConfig: {
        repeatType: 0,
        time: nowTime,
        dates: [nowDate],
        startDate: nowDate,
        endDate: getDateOffsetStr(nowDate, 1),
        interval: 0,
        weekDays: []
      },
      forbidTimeConfig: {
        enabled: false,
        forbidTimes: [{ startTime: '00:00:00', endTime: '00:00:00' }]
      }
    }
  }
}
