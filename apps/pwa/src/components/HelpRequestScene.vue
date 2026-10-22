<template>
  <figure class="help-scene" :class="{ 'help-scene--paused': paused }">
    <svg viewBox="0 0 480 180" role="img" aria-label="Один человек обращается за помощью, второй поворачивается к нему">
      <ellipse cx="240" cy="159" rx="163" ry="9" class="help-scene__ground" />
      <path d="M225 126h30m-8-7 8 7-8 7" class="help-scene__connection" />
      <g class="help-scene__asker">
        <circle cx="152" cy="64" r="18" class="help-scene__skin" />
        <path d="M134 60c0-24 37-25 36 2-11-2-20-9-24-12-2 6-6 9-12 10" class="help-scene__hair" />
        <path d="M135 94q17-15 34 0l7 42h-48z" class="help-scene__shirt" />
        <path d="m140 136-4 20m27-20 5 20" class="help-scene__limbs" />
        <path d="m132 99-10 28" class="help-scene__arm" />
        <g class="help-scene__gesture"><path d="m170 99 20 7 14-20" class="help-scene__arm" /><circle cx="205" cy="83" r="5" class="help-scene__skin" /></g>
        <circle cx="159" cy="64" r="2" class="help-scene__eye" />
      </g>
      <g class="help-scene__listener">
        <circle cx="324" cy="64" r="18" class="help-scene__skin" />
        <path d="M306 58c-1-22 36-24 36 2-12 0-21-8-24-12-3 6-7 9-12 10" class="help-scene__hair" />
        <path d="M307 94q17-15 34 0l7 42h-48z" class="help-scene__shirt help-scene__shirt--listener" />
        <path d="m312 136-4 20m27-20 5 20" class="help-scene__limbs" />
        <path d="m307 99-17 17-12-6m63-11 10 28" class="help-scene__arm" />
        <circle cx="317" cy="64" r="2" class="help-scene__eye" />
        <path d="M315 73q5 5 10 0" class="help-scene__smile" />
      </g>
      <g class="help-scene__bubble">
        <path d="M192 19h66q12 0 12 12v27q0 12-12 12h-39l-15 12 3-12h-15q-12 0-12-12V31q0-12 12-12z" class="help-scene__bubble-fill" />
        <text x="225" y="54" text-anchor="middle" class="help-scene__question">?</text>
      </g>
    </svg>
    <figcaption>
      <span>Обращаемся за помощью</span>
      <button type="button" :aria-label="paused ? 'Включить анимацию' : 'Приостановить анимацию'" :aria-pressed="paused" @click="paused = !paused">
        <q-icon :name="paused ? 'play_arrow' : 'pause'" size="18px" />
      </button>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const paused = ref(false);
</script>

<style scoped>
.help-scene { margin: 18px 0 0; padding: 8px 16px; border-radius: 16px; background: color-mix(in srgb, var(--category-accent) 7%, var(--app-surface)); color: var(--category-accent); }
.help-scene svg { display: block; width: 100%; max-width: 480px; height: auto; margin: auto; }
.help-scene__ground { fill: currentColor; opacity: .12; }
.help-scene__skin { fill: #edbc95; }
.help-scene__hair { fill: #39434f; }
.help-scene__eye { fill: #26333b; }
.help-scene__shirt { fill: currentColor; }
.help-scene__shirt--listener { fill: #71aaa4; }
.help-scene__limbs, .help-scene__arm, .help-scene__smile, .help-scene__connection { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.help-scene__limbs { stroke: var(--app-muted-strong); stroke-width: 9; }
.help-scene__arm { stroke: #edbc95; stroke-width: 9; }
.help-scene__smile { stroke: #955c48; stroke-width: 2; }
.help-scene__connection { stroke: currentColor; stroke-width: 2; opacity: .5; }
.help-scene__bubble-fill { fill: var(--app-surface); stroke: currentColor; stroke-width: 2; }
.help-scene__question { fill: currentColor; font: 700 30px sans-serif; }
.help-scene__gesture { transform-origin: 170px 99px; animation: help-gesture 4s ease-in-out infinite; }
.help-scene__listener { transform-origin: 324px 150px; animation: help-listen 4s ease-in-out infinite; }
.help-scene__bubble { animation: help-bubble 4s ease-in-out infinite; }
.help-scene--paused * { animation-play-state: paused; }
.help-scene figcaption { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--app-muted); font-size: .8rem; }
.help-scene button { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--category-border); border-radius: 50%; color: var(--category-accent); background: var(--app-surface); cursor: pointer; }
@keyframes help-gesture { 0%, 20%, 75%, 100% { transform: rotate(0deg); } 35%, 55% { transform: rotate(-12deg); } }
@keyframes help-listen { 0%, 35%, 85%, 100% { transform: rotate(0deg); } 50%, 65% { transform: rotate(-4deg); } }
@keyframes help-bubble { 0%, 15%, 85%, 100% { opacity: .35; transform: translateY(3px); } 30%, 70% { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .help-scene * { animation: none; } .help-scene button { display: none; } }
</style>
