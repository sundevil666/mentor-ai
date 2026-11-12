<template>
  <div
    class="learning-balance-score"
    :class="`learning-balance-score--${balanceTone}`"
    :aria-label="`Learning balance ${score}%, target 100%`"
  >
    <svg
      class="learning-balance-gauge"
      viewBox="0 0 200 118"
      aria-hidden="true"
    >
      <path
        class="learning-balance-gauge__track"
        d="M 20 100 A 80 80 0 0 1 180 100"
        pathLength="100"
      />
      <path
        class="learning-balance-gauge__zone learning-balance-gauge__zone--red"
        d="M 20 100 A 80 80 0 0 1 180 100"
        pathLength="100"
      />
      <path
        class="learning-balance-gauge__zone learning-balance-gauge__zone--yellow"
        d="M 20 100 A 80 80 0 0 1 180 100"
        pathLength="100"
      />
      <path
        class="learning-balance-gauge__zone learning-balance-gauge__zone--green"
        d="M 20 100 A 80 80 0 0 1 180 100"
        pathLength="100"
      />
      <path
        class="learning-balance-gauge__value learning-balance-gauge__value--red"
        d="M 20 100 A 80 80 0 0 1 180 100"
        pathLength="100"
        :stroke-dasharray="`${Math.min(score, 30)} 100`"
      />
      <path
        class="learning-balance-gauge__value learning-balance-gauge__value--yellow"
        d="M 20 100 A 80 80 0 0 1 180 100"
        pathLength="100"
        :stroke-dasharray="`${Math.min(30, Math.max(0, score - 30))} 100`"
      />
      <path
        class="learning-balance-gauge__value learning-balance-gauge__value--green"
        d="M 20 100 A 80 80 0 0 1 180 100"
        pathLength="100"
        :stroke-dasharray="`${Math.max(0, score - 60)} 100`"
      />
      <line
        class="learning-balance-gauge__needle"
        x1="100"
        y1="100"
        x2="100"
        y2="35"
        :transform="`rotate(${-90 + score * 1.8} 100 100)`"
      />
      <circle
        class="learning-balance-gauge__hub"
        cx="100"
        cy="100"
        r="7"
      />
      <text
        x="18"
        y="116"
      >0</text><text
        x="166"
        y="116"
      >100</text>
    </svg>
    <strong>{{ score }}%</strong>
    <span>current mix · target 100%</span>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ score: number }>();
const balanceTone = computed(() => props.score <= 30 ? 'red' : props.score <= 60 ? 'yellow' : 'green');
</script>
