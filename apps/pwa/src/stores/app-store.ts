import { defineStore } from 'pinia';
import type { StorageMode } from '@mentor-ai/shared';

export const useAppStore = defineStore('app', {
  state: () => ({
    storageMode: 'demo' as StorageMode,
    isOfflineReady: true,
  }),
});
