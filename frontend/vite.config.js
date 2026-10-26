import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  if (mode === 'production') {
    const apiUrl = env.VITE_API_URL?.trim()
    if (!apiUrl) {
      throw new Error('VITE_API_URL is required to build the production app (configure frontend/.env.production).')
    }

    let parsedApiUrl
    try {
      parsedApiUrl = new URL(apiUrl)
    } catch {
      throw new Error('VITE_API_URL must be a valid HTTPS URL for production builds.')
    }
    if (
      parsedApiUrl.protocol !== 'https:'
      || !parsedApiUrl.hostname
      || ['localhost', '127.0.0.1', '[::1]'].includes(parsedApiUrl.hostname)
      || parsedApiUrl.username
      || parsedApiUrl.password
    ) {
      throw new Error('VITE_API_URL must use HTTPS and cannot point to localhost in production builds.')
    }
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
