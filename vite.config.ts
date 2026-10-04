import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import dns from 'dns'

// Prioritaskan IPv4 untuk mencegah timeout koneksi Google APIs / Meta Graph API
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first')
}

// Muat variabel .env lokal ke process.env Node server
const env = loadEnv('development', process.cwd(), '')
Object.assign(process.env, env)

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

          if (req.url?.startsWith('/api/auth/tiktok-login') && req.method === 'GET') {
            try {
              if (!customRes.redirect) {
                customRes.redirect = function (status: number, url: string) {
                  this.statusCode = status
                  this.setHeader('Location', url)
                  this.end()
                  return this
                }
              }
              const m: any = await import('./api/auth/tiktok-login.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if ((req.url?.startsWith('/auth/tiktok-callback') || req.url?.startsWith('/api/auth/tiktok-callback')) && req.method === 'GET') {
            try {
              if (!customRes.redirect) {
                customRes.redirect = function (status: number, url: string) {
                  this.statusCode = status
                  this.setHeader('Location', url)
                  this.end()
                  return this
                }
              }
              const m: any = await import('./api/auth/tiktok-callback.js' as any)
              await m.default(req, customRes)
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/ai/caption') && req.method === 'POST') {
            try {
              let bodyStr = ''
              req.on('data', (chunk: any) => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  ;(req as any).body = bodyStr ? JSON.parse(bodyStr) : {}
                } catch {
                  ;(req as any).body = {}
                }
                const m: any = await import('./api/ai/caption.js' as any)
                await m.default(req, customRes)
              })
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/ai/video-prompt') && req.method === 'POST') {
            try {
              let bodyStr = ''
              req.on('data', (chunk: any) => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  ;(req as any).body = bodyStr ? JSON.parse(bodyStr) : {}
                } catch {
                  ;(req as any).body = {}
                }
                const m: any = await import('./api/ai/video-prompt.js' as any)
                await m.default(req, customRes)
              })
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/ai/concept-generator') && req.method === 'POST') {
            try {
              let bodyStr = ''
              req.on('data', (chunk: any) => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  ;(req as any).body = bodyStr ? JSON.parse(bodyStr) : {}
                } catch {
                  ;(req as any).body = {}
                }
                const m: any = await import('./api/ai/concept-generator.js' as any)
                await m.default(req, customRes)
              })
            } catch (err: any) {
              customRes.status(500).json({ success: false, error: err.message })
            }
            return
          }

          if (req.url?.startsWith('/api/accounts-quota')) {
            try {
              const m: any = await import('./api/accounts-quota.js' as any)
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

        // Background Heartbeat Dispatcher (Jalankan setiap 10 detik agar jadwal tidak macet di PENDING)
        let isDispatching = false
        setInterval(async () => {
          if (isDispatching) return
          isDispatching = true
          try {
            const m: any = await import('./api/cron/dispatcher.js' as any)
            const mockReq = { method: 'GET', headers: {} }
            const mockRes = {
              statusCode: 200,
              status(code: number) { this.statusCode = code; return this },
              json(_d: any) { return this },
              setHeader() { return this },
              end() { return this }
            }
            await m.default(mockReq, mockRes)
          } catch (e: any) {
            // silent catch
          } finally {
            isDispatching = false
          }
        }, 10000)
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  }
})
