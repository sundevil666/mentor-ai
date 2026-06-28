/// <reference lib="webworker" />

declare const process: {
  env: {
    APP_VERSION: string;
    SERVICE_WORKER_FILE: string;
  };
};

interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
}
