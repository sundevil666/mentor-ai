import type { RouteRecordRaw } from 'vue-router';
import MainLayout from 'layouts/MainLayout.vue';
const DashboardPage = () => import('pages/DashboardPage.vue');
const ErrorNotFound = () => import('pages/ErrorNotFound.vue');
const SettingsPage = () => import('pages/SettingsPage.vue');
const StatisticsPage = () => import('pages/StatisticsPage.vue');
const StoriesPage = () => import('pages/StoriesPage.vue');
const StoragePage = () => import('pages/StoragePage.vue');
const AudioPage = () => import('pages/AudioPage.vue');
const PatternsPage = () => import('pages/PatternsPage.vue');
const MoviesPage = () => import('pages/MoviesPage.vue');
const LearningBalancePage = () => import('pages/LearningBalancePage.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardPage,
        meta: { routeOrder: 0 },
      },
      {
        path: 'patterns',
        name: 'patterns',
        component: PatternsPage,
        meta: { routeOrder: 1 },
      },
      {
        path: 'audio',
        name: 'audio',
        component: AudioPage,
        meta: { routeOrder: 1 },
      },
      {
        path: 'stories',
        redirect: (to) => ({ name: 'audio-stories', query: to.query, hash: to.hash }),
      },
      {
        path: 'audio/stories',
        name: 'audio-stories',
        component: StoriesPage,
        props: { libraryMode: 'audio' },
        meta: { routeOrder: 1 },
      },
      {
        path: 'reading',
        name: 'reading',
        component: StoriesPage,
        props: { libraryMode: 'reading' },
        meta: { routeOrder: 1 },
      },
      {
        path: 'movies',
        name: 'movies',
        component: MoviesPage,
        meta: { routeOrder: 1 },
      },
      { path: 'videos', redirect: (to) => ({ name: 'audio-stories', query: to.query, hash: to.hash }) },
      {
        path: 'storage', name: 'storage', component: StoragePage, meta: { routeOrder: 2 },
      },
      {
        path: 'statistics',
        name: 'statistics',
        component: StatisticsPage,
        meta: { routeOrder: 2 },
      },
      {
        path: 'learning-balance', name: 'learning-balance', component: LearningBalancePage, meta: { routeOrder: 2 },
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
        meta: { routeOrder: 3 },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: ErrorNotFound,
  },
];

export default routes;
