<template>
  <section
    v-for="(page, pageIndex) in pages"
    :key="page.id"
    class="personal-reader__chapter"
    :data-book-chapter-index="pageIndex"
  >
    <h2 class="personal-reader__part">{{ page.title }}</h2>
    <p v-for="(paragraph, paragraphIndex) in page.paragraphs" :key="paragraphIndex">
      <template v-for="(token, tokenIndex) in paragraph" :key="tokenIndex">
        <span
          v-if="token.isWord"
          class="personal-reader__word"
          :data-reader-word="token.text"
          :data-reader-word-index="token.wordIndex"
        >{{ token.text }}</span>
        <template v-else>{{ token.text }}</template>
      </template>
    </p>
  </section>
</template>

<script setup lang="ts">
// Stable page props keep microphone, lookup and speech updates out of the
// book's render tree. Dynamic classes are owned by the indexed highlighter.
defineProps<{
  pages: Array<{
    id: string;
    title: string;
    paragraphs: Array<Array<{ text: string; isWord: boolean; wordIndex?: number }>>;
  }>;
}>();
</script>
