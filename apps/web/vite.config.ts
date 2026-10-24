import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Vercel production builds fail at build time when the public config is
  // missing. Local `pnpm --filter web build` runs are intentionally exempt;
  // the runtime guard in src/config/env.ts still covers every production bundle.
  if (mode === 'production' && process.env.VERCEL === '1') {
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_URL'];
    const missing = required.filter((key) => !env[key]?.trim());

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for the Vercel production build: ${missing.join(', ')}. ` +
          'Set them in the Vercel project settings before deploying the web app.',
      );
    }
  }

  const apiProxy = env.VITE_API_PROXY;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      ...(apiProxy && {
        proxy: {
          '/api': {
            target: apiProxy,
            changeOrigin: false,
            secure: false,
          },
        },
      }),
    },
  };
});
