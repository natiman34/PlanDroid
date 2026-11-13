import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-192x192.png', 'pwa-maskable-512x512.png', 'manifest.webmanifest', 'manifest.json'],
        manifest: {
          id: '/',
          name: 'PlanDroid - Smart Task Planner',
          short_name: 'PlanDroid',
          description: 'Offline-first smart task planner and scheduler with notifications and momentum tracking.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['productivity', 'utilities'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest,json}'],
          navigateFallback: '/index.html',
          navigateFallbackAllowlist: [/^(?!\/__).*/],
        },
        devOptions: {
          enabled: true,
          type: 'classic',
        },
      }),
      {
        name: 'disable-hmr-websocket-client',
        apply: 'serve' as const,
        enforce: 'post' as const,
        transform(code: string, id: string) {
          if (id.includes('/vite/dist/client/client.mjs') || id.includes('\\vite\\dist\\client\\client.mjs')) {
            const patched = code.replace(
              /const transport = normalizeModuleRunnerTransport\(\(\(\) => \{[\s\S]*?\}\)\(\)\);/,
              'const transport = normalizeModuleRunnerTransport({ connect() {}, disconnect() {}, send() {} });'
            );
            return {
              code: patched,
              map: null,
            };
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': process.cwd(),
      },
    },
    server: {
      // HMR and WebSocket are disabled in AI Studio to prevent WebSocket closed errors across cloud proxies
      hmr: false as const,
      ws: false as const,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
