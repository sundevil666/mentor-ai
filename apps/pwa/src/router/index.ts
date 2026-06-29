import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { readLastRoutePreference, saveLastRoutePreference } from 'src/services/user-preferences';

export default route(() => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  router.beforeEach((to) => {
    if (process.env.SERVER || to.name !== 'dashboard' || to.fullPath !== '/') {
      return true;
    }

    const lastRoute = readLastRoutePreference();
    return lastRoute && lastRoute !== to.fullPath ? lastRoute : true;
  });

  router.afterEach((to) => {
    if (!process.env.SERVER && to.matched.length > 0 && to.name !== undefined) {
      saveLastRoutePreference(to.fullPath);
    }
  });

  return router;
});
