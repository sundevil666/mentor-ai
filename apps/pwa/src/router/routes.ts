import type { RouteRecordRaw } from 'vue-router';
import MainLayout from 'layouts/MainLayout.vue';
import DashboardPage from 'pages/DashboardPage.vue';
import ErrorNotFound from 'pages/ErrorNotFound.vue';
import SettingsPage from 'pages/SettingsPage.vue';
import StatisticsPage from 'pages/StatisticsPage.vue';
import StoriesPage from 'pages/StoriesPage.vue';
import StoragePage from 'pages/StoragePage.vue';
import AudioPage from 'pages/AudioPage.vue';

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
        path: 'audio',
        name: 'audio',
        component: AudioPage,
        meta: { routeOrder: 1 },
      },
      {
        path: 'stories',
        name: 'stories',
        component: StoriesPage,
        meta: { routeOrder: 1 },
      },
      { path: 'videos', redirect: { name: 'stories' } },
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
