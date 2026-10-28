<template>
  <figure class="situation-scene" :class="[`situation-scene--${scene}`, { 'situation-scene--paused': paused }]">
    <HelpRequestScene v-if="scene === 'help'" />
    <svg v-else viewBox="0 0 260 160" role="img" :aria-label="description">
        <g class="situation-scene__person" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="65" cy="36" r="18" />
          <path d="M65 54v47m0-34-22 23m22-23 26 17" />
          <path class="situation-scene__leg-left" d="m65 101-18 35H37" /><path class="situation-scene__leg-right" d="m65 101 18 35h10" />
          <path d="M59 42q6 6 12 0" stroke-width="2" />
          <circle cx="59" cy="33" r="1.5" fill="currentColor" /><circle cx="71" cy="33" r="1.5" fill="currentColor" />
        </g>
      <g class="situation-scene__object" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="scene === 'check' || scene === 'explain'">
          <rect x="133" y="42" width="73" height="91" rx="7" /><path d="M150 64h38m-38 15h29m-29 15h20m3 19 9 8 16-20" />
        </template>
        <template v-else-if="scene === 'parcel'">
          <path d="m133 78 38-20 37 20v47l-37 19-38-19zm0 0 38 20 37-20m-37 20v46m-18-76 37 20v20" />
        </template>
        <template v-else-if="scene === 'window'">
          <path d="M132 48h78v79h-78zm39 0v79m-39-40h78m-85 47h92" />
          <path d="m137 55 27 7v54l-27 5zm41 7 25-7v66l-25-5z" />
        </template>
        <template v-else-if="scene === 'door' || scene === 'door-open'">
          <path d="M132 140V26h76v114" />
          <g class="situation-scene__door"><path d="M137 30h66v107h-66z" /><circle cx="190" cy="87" r="3" /></g>
        </template>
        <template v-else-if="scene === 'keys'">
          <circle cx="155" cy="78" r="21" /><path d="m170 94 33 33m-12-12 9-9m-18 0 9-9" /><circle cx="150" cy="73" r="5" />
          <path d="M123 44q0-17 15-17t15 14c0 9-15 9-15 19m0 9v1" />
        </template>
        <template v-else-if="scene === 'repair'">
          <path d="M155 48a20 20 0 0 0 23 26l26 38a9 9 0 0 1-15 11l-26-38a20 20 0 0 1-20-30l8 15 13-8z" />
          <path d="M124 128h25m-12-12v24" />
        </template>
        <template v-else-if="scene === 'cafe'">
          <path d="M137 73h48v27q0 22-24 22t-24-22zm48 5h8q19 0 0 23h-8m-59 29h72m-51-68q-9-10 0-20m19 20q-9-10 0-20" />
        </template>
        <template v-else-if="scene === 'wait'">
          <circle cx="171" cy="83" r="36" /><path d="M171 58v27l17 11" />
        </template>
        <template v-else-if="scene === 'relief'">
          <path d="M127 77q12-13 26 0m10-18q12-13 26 0m-56 51q15 15 31 0m21-14 6 7 15-21" />
        </template>
        <template v-else-if="scene === 'traffic' || scene === 'run'">
          <rect x="132" y="59" width="83" height="59" rx="9" /><path d="M140 71h66v23h-66zm20 0v23m25-23v23m-45 36h66" />
          <circle cx="149" cy="120" r="8" /><circle cx="199" cy="120" r="8" />
        </template>
        <template v-else-if="scene === 'phone'">
          <rect x="150" y="42" width="48" height="89" rx="8" /><path d="M166 51h16m-10 70h4m32-62q15 20 0 40m10-50q22 29 0 60" />
        </template>
        <template v-else-if="scene === 'tickets'">
          <path d="m130 71 74-14 4 22q-14 3-11 13t15 8l4 22-74 14-4-22q14-3 11-13t-15-8zm50-7 12 62" />
        </template>
      </g>
      <path v-if="scene === 'run'" class="situation-scene__speed" d="M20 69h16m-22 12h19m-12 12h13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
    <button v-if="animated" class="situation-scene__pause" type="button" :aria-label="paused ? 'Включить анимацию' : 'Приостановить анимацию'" :aria-pressed="paused" @click="paused = !paused"><q-icon :name="paused ? 'play_arrow' : 'pause'" size="16px" /></button>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ExerciseScene } from 'src/services/exercise-scene';
import HelpRequestScene from './HelpRequestScene.vue';
const props = defineProps<{ scene: ExerciseScene }>();
const paused = ref(false);
const animated = computed(() => ['door-open', 'run'].includes(props.scene));
const descriptions: Record<ExerciseScene, string> = {
  window: 'Человек возле окна', help: 'Просьба о помощи', check: 'Человек проверяет запись', parcel: 'Человек и посылка', door: 'Человек возле двери', 'door-open': 'Человек открывает дверь', keys: 'Человек ищет ключи', repair: 'Человек и инструмент для ремонта', cafe: 'Человек в кафе', wait: 'Человек ждёт', relief: 'Человек испытывает облегчение', explain: 'Человек разбирается в объяснении', traffic: 'Транспорт на дороге', run: 'Человек бежит к автобусу', phone: 'Человек и телефонный звонок', tickets: 'Человек забирает билеты',
};
const description = computed(() => descriptions[props.scene]);
</script>

<style scoped>
.situation-scene { position: relative; margin: 0; color: var(--app-text-strong); opacity: .8; }
.situation-scene svg { display: block; width: 100%; height: auto; }
.situation-scene__pause { position: absolute; bottom: -12px; right: 0; display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid var(--app-border); border-radius: 50%; background: var(--app-surface); color: inherit; cursor: pointer; }
.situation-scene--door-open .situation-scene__door { transform-origin: 137px 80px; animation: scene-open 4s ease-in-out infinite; }
.situation-scene--run .situation-scene__person { transform-origin: 65px 100px; animation: scene-run .65s ease-in-out infinite alternate; }
.situation-scene--run .situation-scene__speed { animation: scene-speed .65s ease-in-out infinite alternate; }
.situation-scene--paused * { animation-play-state: paused; }
.situation-scene--run .situation-scene__leg-left, .situation-scene--run .situation-scene__leg-right { transform-origin: 65px 101px; animation: scene-stride .65s ease-in-out infinite alternate; }
.situation-scene--run .situation-scene__leg-right { animation-direction: alternate-reverse; }
@keyframes scene-stride { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes scene-open { 0%, 15%, 100% { transform: scaleX(1); } 45%, 75% { transform: scaleX(.35) skewY(-8deg); } }
@keyframes scene-run { from { transform: translateY(0) rotate(10deg); } to { transform: translateY(-4px) rotate(17deg); } }
@keyframes scene-speed { from { opacity: .3; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .situation-scene * { animation: none !important; } .situation-scene__pause { display: none; } }
</style>
