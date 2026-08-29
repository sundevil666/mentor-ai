import { reactive } from 'vue';

export const personalBookSyncControl = reactive({
  disabled: true,
  icon: 'cloud_sync',
  label: 'Sync books',
  loading: false,
  status: 'Cloud library is ready to synchronize.',
  trigger: null as (() => void) | null,
  visible: false,
});
