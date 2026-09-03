import type { RouteRecordRaw } from 'vue-router';
import MainLayout from 'layouts/MainLayout.vue';
import DashboardPage from 'pages/DashboardPage.vue';
import ErrorNotFound from 'pages/ErrorNotFound.vue';
import SettingsPage from 'pages/SettingsPage.vue';
import StatisticsPage from 'pages/StatisticsPage.vue';
import StoriesPage from 'pages/StoriesPage.vue';
import StoragePage from 'pages/StoragePage.vue';
import AudioPage from 'pages/AudioPage.vue';
import PatternsPage from 'pages/PatternsPage.vue';

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
