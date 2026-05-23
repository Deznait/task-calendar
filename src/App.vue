<template>
  <router-view />
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useAuthStore } from 'src/stores/auth.store'

  const authStore = useAuthStore()
  onMounted(() => authStore.init())
</script>