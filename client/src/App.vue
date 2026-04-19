<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body {
  font-family:
    'Segoe UI',
    system-ui,
    -apple-system,
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
  color: #0f172a;
  background: #f8fafc;
}
#app {
  min-height: 100vh;
}
</style>