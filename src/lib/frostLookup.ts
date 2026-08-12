/**
 * Look up average first fall frost (32°F, 50% probability) by US ZIP.
 * Source: NOAA Climate Normals (1991–2020).
 * Production uses /api/frost (Netlify function). Dev calls the upstream API directly.
 */

export interface FrostLookupResult {
  zip: string
  frostDate: string // YYYY-MM-DD
  city?: string
  state?: string
  stationName?: string
  probability: '50%'
  frostFree?: boolean
}

/**
 * Frost-free climates have no first-frost date. Use Dec 31 as a planning
 * stand-in so planting windows still calculate; gardeners can edit it.
 */
export function frostFreeProxyDate(year = new Date().getFullYear()): string {
  return `${year}-12-31`
}

function toIsoDate(monthDay: string, year: number): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(monthDay.trim())
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function normalizeZip(input: string): string {
  return input.replace(/\D/g, '').slice(0, 5)
}

export function parseFrostApiPayload(
  zip: string,
  body: unknown,
  year = new Date().getFullYear(),
): FrostLookupResult {
  const root = body as {
    data?: {
      frost_free?: boolean
      location?: { city?: string; state?: string }
      weather_station?: { name?: string }
      frost_dates?: { first_frost_32f?: Record<string, string | null> }
    }
  }

  const data = root.data
  if (!data) {
    throw new Error('Unexpected frost API response.')
  }

  const place = {
    city: data.location?.city,
    state: data.location?.state,
    stationName: data.weather_station?.name,
  }

  if (data.frost_free) {
    return {
      zip,
      frostDate: frostFreeProxyDate(year),
      ...place,
      probability: '50%',
      frostFree: true,
    }
  }

  const median = data.frost_dates?.first_frost_32f?.['50%']
  if (!median) {
    // Some stations report no median frost — treat like frost-free
    return {
      zip,
      frostDate: frostFreeProxyDate(year),
      ...place,
      probability: '50%',
      frostFree: true,
    }
  }

  const frostDate = toIsoDate(median, year)
  if (!frostDate) {
    throw new Error('Could not parse first-frost date.')
  }

  return {
    zip,
    frostDate,
    ...place,
    probability: '50%',
  }
}

export async function lookupFrostByZip(
  zipInput: string,
): Promise<FrostLookupResult> {
  const zip = normalizeZip(zipInput)
  if (zip.length !== 5) {
    throw new Error('Enter a 5-digit US zip code.')
  }

  // Always hit /api/frost — Vite proxies locally; Netlify function in production.
  // (Upstream frost API has no CORS headers, so the browser cannot call it directly.)
  const response = await fetch(`/api/frost?zip=${encodeURIComponent(zip)}`)
  const payload = (await response.json()) as FrostLookupResult & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Could not look up frost date for that zip.')
  }

  const frostFree = Boolean(payload.frostFree)
  return {
    zip,
    frostDate: payload.frostDate || (frostFree ? frostFreeProxyDate() : ''),
    city: payload.city,
    state: payload.state,
    stationName: payload.stationName,
    probability: '50%',
    frostFree,
  }
}
