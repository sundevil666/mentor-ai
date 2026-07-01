/// <reference lib="webworker" />

declare const process: {
  env: {
    APP_VERSION: string;
    PROD: boolean;
    PWA_FALLBACK_HTML: string;
    PWA_SERVICE_WORKER_REGEX: string;
    SERVICE_WORKER_FILE: string;
  };
};

interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
}
