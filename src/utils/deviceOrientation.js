/**
 * 设备朝向角度 ↔ 文案（对齐移动端 System.angleToDirection）
 */
export const ORIENTATION_OPTIONS = [
  { label: '北 (0°)', value: 0 },
  { label: '东北 (45°)', value: 45 },
  { label: '东 (90°)', value: 90 },
  { label: '东南 (135°)', value: 135 },
  { label: '南 (180°)', value: 180 },
  { label: '西南 (225°)', value: 225 },
  { label: '西 (270°)', value: 270 },
  { label: '西北 (315°)', value: 315 }
]

export function angleToDirection(angle) {
  const directions = [
    { text: '北', min: 337.5, max: 22.5 },
    { text: '东北', min: 22.5, max: 67.5 },
    { text: '东', min: 67.5, max: 112.5 },
    { text: '东南', min: 112.5, max: 157.5 },
    { text: '南', min: 157.5, max: 202.5 },
    { text: '西南', min: 202.5, max: 247.5 },
    { text: '西', min: 247.5, max: 292.5 },
    { text: '西北', min: 292.5, max: 337.5 }
  ]
  let a = ((Number(angle) % 360) + 360) % 360
  if (a >= 337.5 || a < 22.5) return directions[0].text
  for (let i = 1; i < directions.length; i++) {
    if (a >= directions[i].min && a < directions[i].max) {
      return directions[i].text
    }
  }
  return directions[0].text
}

/** 将任意角度吸附到最近的方位选项值 */
export function snapOrientationAngle(angle) {
  const n = Number(angle)
  if (!Number.isFinite(n)) return 0
  const normalized = ((n % 360) + 360) % 360
  let best = ORIENTATION_OPTIONS[0].value
  let bestDiff = 360
  ORIENTATION_OPTIONS.forEach((opt) => {
    let diff = Math.abs(normalized - opt.value)
    if (diff > 180) diff = 360 - diff
    if (diff < bestDiff) {
      bestDiff = diff
      best = opt.value
    }
  })
  return best
}

export const OPERATOR_TYPE_LIST = ['中国移动', '中国联通', '中国电信']
