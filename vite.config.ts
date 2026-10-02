import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'local-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const customRes = res as any
          if (!customRes.status) {
            customRes.status = function (code: number) { this.statusCode = code; return this }
          }
          if (!customRes.json) {
            customRes.json = function (data: any) {
              this.setHeader('Content-Type', 'application/json')
              this.end(JSON.stringify(data))
              return this
            }
          }

          if (req.url === '/api/upload' && req.method === 'POST') {
            try {
              const m: any = await import('./api/upload.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/gdrive-media') && req.method === 'GET') {
            try {
              const m: any = await import('./api/gdrive-media.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/gdrive-files') && req.method === 'GET') {
            try {
              const m: any = await import('./api/gdrive-files.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/auth/meta-login') && req.method === 'GET') {
            try {
              if (!customRes.redirect) {
                customRes.redirect = function (status: number, url: string) {
                  this.statusCode = status
                  this.setHeader('Location', url)
                  this.end()
                  return this
                }
              }
              const m: any = await import('./api/auth/meta-login.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/auth/meta-callback') && req.method === 'GET') {
            try {
              if (!customRes.redirect) {
                customRes.redirect = function (status: number, url: string) {
                  this.statusCode = status
                  this.setHeader('Location', url)
                  this.end()
                  return this
                }
              }
              const m: any = await import('./api/auth/meta-callback.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/cron/dispatcher')) {
            try {
              const m: any = await import('./api/cron/dispatcher.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  }
})
