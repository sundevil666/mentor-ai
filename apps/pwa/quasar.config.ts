import { configure } from 'quasar/wrappers';

const appVersion = createAppVersion();

export default configure(() => ({
  boot: ['pinia'],
  css: ['app.scss'],
  extras: ['roboto-font', 'material-icons'],
  framework: {
    config: {},
    plugins: ['Notify'],
  },
  build: {
    env: {
      APP_VERSION: appVersion,
    },
    target: {
      browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
      node: 'node20',
    },
    typescript: {
      strict: true,
      vueShim: true,
    },
    vueRouterMode: 'history',
  },
  devServer: {
    open: false,
    port: 9000,
  },
  pwa: {
    workboxMode: 'GenerateSW',
    injectPwaMetaTags: true,
    swFilename: 'sw.js',
    manifestFilename: 'manifest.json',
    useCredentialsForManifestTag: false,
    extendGenerateSWOptions(cfg) {
      cfg.cleanupOutdatedCaches = true;
      cfg.clientsClaim = true;
      cfg.skipWaiting = true;
      cfg.navigateFallback = 'index.html';
      cfg.runtimeCaching = [
        {
          urlPattern: /^https?:\/\/localhost:\d+\/api\//,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'mentor-ai-api',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 60 * 60 * 24,
            },
          },
        },
      ];
    },
    manifest: {
      name: 'Mentor AI',
      short_name: 'Mentor AI',
      description: 'Personal AI English learning platform',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#1b5e57',
      icons: [
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: 'icons/apple-icon-180x180.png',
          sizes: '180x180',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },
  },
}));

function createAppVersion() {
  const packageVersion = process.env.npm_package_version ?? '0.1.0';
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;

  if (!commitSha) {
    return packageVersion;
  }

  return `${packageVersion}+${commitSha.slice(0, 12)}`;
}
