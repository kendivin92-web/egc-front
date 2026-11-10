import { createReadStream, stat } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
    preview: {
      host: '0.0.0.0',
      allowedHosts: ['egliseglorieuseduchrist.up.railway.app'],
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'apk-download-headers',
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.split('?')[0] !== '/app-egc.apk') {
              next()
              return
            }

            if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.statusCode = 405
              res.setHeader('Allow', 'GET, HEAD')
              res.end()
              return
            }

            const apkPath = fileURLToPath(new URL('./dist/app-egc.apk', import.meta.url))
            stat(apkPath, (error, fileStats) => {
              if (error) {
                next(error)
                return
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/vnd.android.package-archive')
              res.setHeader('Content-Disposition', 'attachment; filename="EGC-Android.apk"')
              res.setHeader('Content-Length', fileStats.size)

              if (req.method === 'HEAD') {
                res.end()
                return
              }

              createReadStream(apkPath).pipe(res)
            })
          })
        },
      },
    ],
  }
})
