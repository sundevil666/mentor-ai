<template>
  <figure class="help-scene">
    <svg viewBox="0 0 480 230" role="img" aria-label="Два человечка: один с вопросом обращается к другому за помощью">
      <g class="help-scene__drawing">
        <!-- Open palm and eye contact make the request clear without revealing the answer. -->
        <circle cx="137" cy="55" r="27" />
        <path d="m137 83-2 70m0 0-25 54m25-54 26 54m-51 0h-16m67 0h16" />
        <path d="M136 103q-23 12-34 39m35-40q26 28 46 11l19-22" />
        <path d="m201 92-2-12m3 12 10-6" />
        <circle cx="327" cy="55" r="27" />
        <path d="m327 83 2 70m0 0-25 54m25-54 26 54m-51 0h-16m67 0h16" />
        <path d="M328 103q-22 25-42 14l-13-9m55-5q24 11 29 38" />
        <path d="m273 108-10 1m10-1-4-9" />
        <path class="help-scene__smile" d="M126 63q11 12 22 0m-22 0h22M316 63q11 12 22 0m-22 0h22" />
        <path class="help-scene__bubble" d="M202 15h61q13 0 13 13v30q0 13-13 13h-36l-22 17 4-17h-7q-13 0-13-13V28q0-13 13-13z" />
        <path class="help-scene__question" d="M225 34c0-11 19-11 19 0 0 7-10 7-10 14" />
      </g>
      <g class="help-scene__dots">
        <circle cx="129" cy="51" r="3" /><circle cx="145" cy="51" r="3" />
        <circle cx="319" cy="51" r="3" /><circle cx="335" cy="51" r="3" />
        <circle cx="234" cy="57" r="2.5" />
      </g>
    </svg>
    <figcaption>Обращаемся за помощью</figcaption>
  </figure>
</template>

<style scoped>
.help-scene { margin: 18px 0 0; padding: 8px 16px 12px; border: 1px solid var(--app-border); border-radius: 16px; background: #f5f4f0; color: #25272a; }
.help-scene svg { display: block; width: 100%; max-width: 440px; height: auto; margin: auto; }
.help-scene__drawing { fill: none; stroke: currentColor; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.help-scene__smile { stroke-width: 3; }
.help-scene__bubble { stroke-width: 3; }
.help-scene__question { stroke-width: 4; }
.help-scene__dots { fill: currentColor; }
.help-scene figcaption { color: #626366; text-align: center; font-size: .8rem; line-height: 1.5; }
</style>
