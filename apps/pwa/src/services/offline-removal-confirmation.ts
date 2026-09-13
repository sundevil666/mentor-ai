import { Dialog } from 'quasar';

export function confirmOfflineRemoval(title: string, message?: string): Promise<boolean> {
  return new Promise((resolve) => {
    Dialog.create({
      title: 'Remove from offline?',
      message: message ?? `${title} will be removed from offline storage on this device.`,
      cancel: { label: 'Cancel', flat: true, noCaps: true },
      ok: { label: 'Remove', color: 'negative', icon: 'delete_outline', noCaps: true },
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
      .onDismiss(() => resolve(false));
  });
}
