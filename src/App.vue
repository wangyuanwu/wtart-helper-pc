<template>
  <div class="app">
    <router-view />
    <WaterOutletRiskDialog />
  </div>
</template>

<script setup>
import WaterOutletRiskDialog from '@/components/WaterOutletRiskDialog.vue'
</script>

<style>
.app {
  width: 100%;
  min-height: 100vh;
}
</style>
