import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  if (mode === 'production' && !env.VITE_API_URL?.trim()) {
    throw new Error('VITE_API_URL is required to build the production app (configure frontend/.env.production).')
  }

  return {
    server : {
      host : '0.0.0.0',
      port : 3000,
      watch: {
        ignored: ['**/android/**'],
      },
    },
    plugins: [react(),tailwindcss()],
  }
})
