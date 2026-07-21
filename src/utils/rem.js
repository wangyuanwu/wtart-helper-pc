const ROOT_VALUE = 192

/**
 * 将设计稿 px 转为 rem，与 postcss-pxtorem 的 rootValue 保持一致
 * @param {number|string} px
 * @returns {string}
 */
export function px2rem(px) {
  const value = typeof px === 'string' ? parseFloat(px) : px
  if (Number.isNaN(value)) return px
  if (value === 0) return '0'
  return `${value / ROOT_VALUE}rem`
}
