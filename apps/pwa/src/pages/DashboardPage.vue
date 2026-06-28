<template>
  <q-page class="dashboard-page">
    <section class="dashboard-page__intro">
      <p class="dashboard-page__eyebrow">
        English practice workspace
      </p>
      <h1>Mentor AI</h1>
      <p>
        A Quasar PWA foundation for lessons, speech practice, statistics, and personal AI notes.
      </p>
    </section>

    <section
      class="dashboard-page__grid"
      aria-label="Prepared feature areas"
    >
      <q-card
        v-for="area in featureAreas"
        :key="area.name"
        flat
        bordered
      >
        <q-card-section>
          <div class="text-subtitle1">
            {{ area.name }}
          </div>
          <div class="text-body2 text-grey-7">
            {{ area.description }}
          </div>
        </q-card-section>
      </q-card>
    </section>
  </q-page>
</template>

<script setup lang="ts">
const featureAreas = [
  { name: 'Lessons', description: 'Lesson flows and learning content.' },
  { name: 'Audio', description: 'Generated and cached listening material.' },
  { name: 'Speech', description: 'Recognition, pronunciation, and speaking practice.' },
  { name: 'Statistics', description: 'Progress, streaks, and practice history.' },
  { name: 'Sync', description: 'Offline-first synchronization boundaries.' },
];
</script>
