import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function toIsoDate(monthDay: string, year: number): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(monthDay.trim())
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Upstream has no CORS — proxy + reshape so local fetch('/api/frost') works
      '/api/frost': {
        target: 'https://apis.joelgrant.dev',
        changeOrigin: true,
        selfHandleResponse: true,
        rewrite: (path) => {
          const zip = new URL(path, 'http://localhost').searchParams.get('zip')
          return `/api/v1/frost/${zip ?? ''}`
        },
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const chunks: Buffer[] = []
            proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk))
            proxyRes.on('end', () => {
              const writeJson = (status: number, body: unknown) => {
                const payload = JSON.stringify(body)
                res.writeHead(status, {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(payload),
                })
                res.end(payload)
              }

              try {
                if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                  writeJson(proxyRes.statusCode === 404 ? 404 : 502, {
                    error:
                      proxyRes.statusCode === 404
                        ? 'No frost data found for that zip code.'
                        : 'Frost lookup service is unavailable. Try again or enter a date manually.',
                  })
                  return
                }

                const raw = Buffer.concat(chunks).toString('utf8')
                const body = JSON.parse(raw) as {
                  data?: {
                    zip_code?: string
                    frost_free?: boolean
                    location?: { city?: string; state?: string }
                    weather_station?: { name?: string }
                    frost_dates?: {
                      first_frost_32f?: Record<string, string | null>
                    }
                  }
                }
                const data = body.data
                const zip =
                  data?.zip_code ||
                  new URL(req.url || '', 'http://localhost').searchParams.get(
                    'zip',
                  ) ||
                  ''

                if (!data) {
                  writeJson(502, { error: 'Unexpected frost API response.' })
                  return
                }

                if (data.frost_free) {
                  writeJson(200, {
                    zip,
                    frostDate: '',
                    frostFree: true,
                    city: data.location?.city,
                    state: data.location?.state,
                    stationName: data.weather_station?.name,
                    probability: '50%',
                  })
                  return
                }

                const median = data.frost_dates?.first_frost_32f?.['50%']
                const frostDate = median
                  ? toIsoDate(median, new Date().getFullYear())
                  : null
                if (!frostDate) {
                  writeJson(502, {
                    error: 'Could not parse first-frost date.',
                  })
                  return
                }

                writeJson(200, {
                  zip,
                  frostDate,
                  city: data.location?.city,
                  state: data.location?.state,
                  stationName: data.weather_station?.name,
                  probability: '50%',
                })
              } catch {
                writeJson(502, {
                  error:
                    'Frost lookup service is unavailable. Try again or enter a date manually.',
                })
              }
            })
          })
        },
      },
    },
  },
})
