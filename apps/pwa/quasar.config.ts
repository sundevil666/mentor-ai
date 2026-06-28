import { configure } from 'quasar/wrappers';

export default configure(() => ({
  boot: ['pinia'],
  css: ['app.scss'],
  extras: ['roboto-font', 'material-icons'],
  framework: {
    config: {},
    plugins: ['Notify'],
  },
  build: {
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
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  },
}));
