<template>
  <q-tabs
    :model-value="activeTab"
    class="story-library-tabs"
    active-color="primary"
    align="justify"
    indicator-color="primary"
    no-caps
  >
    <q-route-tab
      icon="podcasts"
      label="Podcasts"
      name="podcasts"
      :to="{ name: 'audio' }"
    />
    <q-route-tab
      icon="auto_stories"
      label="Stories"
      name="stories"
      :to="{ name: 'audio-stories' }"
    />
  </q-tabs>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: 'podcasts' | 'stories';
}>();
</script>
