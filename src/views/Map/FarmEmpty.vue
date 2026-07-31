<template>
  <div class="farm-empty">
    <img class="farm-empty__slogan" :src="sloganImg" alt="用上水能手 灌溉好帮手" />
    <img class="farm-empty__mascot" :src="mascotImg" alt="水能手" />
    <p class="farm-empty__tip">嗨！您还没有农场，请添加农场</p>
    <button class="farm-empty__btn" type="button" @click="handleCreateFarm">新建农场</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import sloganImg from '@/assets/farm/slogan.png'
import mascotImg from '@/assets/farm/mascot.png'

const router = useRouter()

const handleCreateFarm = () => {
  router.push({ path: '/map/chose-farm', query: { type: 'add' } })
}
</script>

<style scoped>
.farm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 40px 20px;
  background: #fff;
  box-sizing: border-box;
}

.farm-empty__slogan {
  width: 520px;
  max-width: 90%;
  height: auto;
  margin-bottom: 24px;
}

.farm-empty__mascot {
  width: 280px;
  max-width: 70%;
  height: auto;
  margin-bottom: 20px;
}

.farm-empty__tip {
  margin: 0 0 32px;
  font-size: 16px;
  color: #8c8c8c;
  line-height: 1.5;
}

.farm-empty__btn {
  min-width: 200px;
  height: 48px;
  padding: 0 40px;
  border: none;
  border-radius: 999px;
  background: #3d5a9a;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.farm-empty__btn:hover {
  background: #324a82;
}
</style>
