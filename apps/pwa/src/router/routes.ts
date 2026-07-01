import type { RouteRecordRaw } from 'vue-router';
import MainLayout from 'layouts/MainLayout.vue';
import DashboardPage from 'pages/DashboardPage.vue';
import ErrorNotFound from 'pages/ErrorNotFound.vue';
import SettingsPage from 'pages/SettingsPage.vue';
import StatisticsPage from 'pages/StatisticsPage.vue';

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
        path: 'statistics',
        name: 'statistics',
        component: StatisticsPage,
        meta: { routeOrder: 1 },
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
        meta: { routeOrder: 2 },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: ErrorNotFound,
  },
];

export default routes;
