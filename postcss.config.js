export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    // 与 imageanalysemachine 一致：设计稿 1920，rootValue = 1920 / 10
    'postcss-pxtorem': {
      rootValue: 192,
      propList: ['*', '!border'],
      selectorBlackList: ['.el-']
    }
  }
}
