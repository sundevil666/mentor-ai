const learningSyncTag = 'mentor-ai-learning-sync';

type ServiceWorkerRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: {
    register(tag: string): Promise<void>;
  };
};

export async function registerLearningBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationWithSync;

  if (!registration.sync) {
    return false;
  }

  await registration.sync.register(learningSyncTag);
  return true;
}
