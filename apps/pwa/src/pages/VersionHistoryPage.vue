<template>
  <q-page class="version-history-page">
    <AppDetailLayout class="version-history-shell">
      <template #header>
        <header class="version-history-header">
          <q-btn
            class="app-back-button"
            color="primary"
            flat
            icon="arrow_back"
            round
            :to="{ name: 'dashboard' }"
          >
            <q-tooltip>Back to learning</q-tooltip>
          </q-btn>
          <div>
            <p>Mentor AI {{ appVersion }}</p>
            <h1>What changed</h1>
          </div>
        </header>
      </template>

      <div v-if="loading" class="version-history-state">
        <q-spinner color="primary" size="36px" />
        <span>Reading Git history…</span>
      </div>

      <div v-else-if="errorMessage" class="version-history-state version-history-state--error">
        <q-icon name="error_outline" size="32px" />
        <span>{{ errorMessage }}</span>
        <q-btn color="primary" label="Try again" no-caps outline @click="loadHistory" />
      </div>

      <template v-else>
        <p class="version-history-intro">
          A chronological record generated directly from the repository. No database is used.
        </p>

        <ol v-if="pageItems.length" class="commit-list">
          <li v-for="commit in pageItems" :key="commit.hash" class="commit-card">
            <div class="commit-card__meta">
              <time :datetime="commit.committedAt">{{ formatCommitDate(commit.committedAt) }}</time>
              <a
                v-if="repositoryUrl"
                :href="`${repositoryUrl}/commit/${commit.hash}`"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ commit.hash.slice(0, 7) }}
                <q-icon name="open_in_new" size="14px" />
              </a>
              <code v-else>{{ commit.hash.slice(0, 7) }}</code>
            </div>
            <p>{{ commit.subject }}</p>
          </li>
        </ol>

        <div v-else class="version-history-state">
          <q-icon name="history" size="32px" />
          <span>No Git commits are available in this build.</span>
        </div>
      </template>

      <template v-if="!loading && !errorMessage && pageCount > 1" #controls>
        <nav class="version-history-pagination" aria-label="Version history pages">
          <q-pagination
            v-model="page"
            color="primary"
            direction-links
            :max="pageCount"
            :max-pages="5"
            boundary-numbers
          />
          <span>Page {{ page }} of {{ pageCount }}</span>
        </nav>
      </template>
    </AppDetailLayout>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppDetailLayout from 'src/components/AppDetailLayout.vue';
import { fetchGitHistory, paginateGitHistory, type GitHistoryCommit } from 'src/services/git-history';

const pageSize = 10;
const route = useRoute();
const router = useRouter();
const appVersion = process.env.APP_VERSION ?? 'development';
const commits = ref<GitHistoryCommit[]>([]);
const repositoryUrl = ref<string | null>(null);
const loading = ref(true);
const errorMessage = ref('');
const page = ref(readPage(route.query.page));
const pagination = computed(() => paginateGitHistory(commits.value, page.value, pageSize));
const pageCount = computed(() => pagination.value.pageCount);
const pageItems = computed(() => pagination.value.items);

watch(page, (value) => {
  const safePage = pagination.value.page;
  if (value !== safePage) {
    page.value = safePage;
    return;
  }
  const query = { ...route.query };
  if (safePage === 1) delete query.page;
  else query.page = String(safePage);
  void router.replace({ query });
});

onMounted(loadHistory);

async function loadHistory() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const history = await fetchGitHistory();
    commits.value = history.commits;
    repositoryUrl.value = history.repositoryUrl;
    page.value = paginateGitHistory(commits.value, page.value, pageSize).page;
  } catch {
    errorMessage.value = 'The Git history could not be loaded. Check the connection and try again.';
  } finally {
    loading.value = false;
  }
}

function readPage(value: unknown) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatCommitDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
</script>
