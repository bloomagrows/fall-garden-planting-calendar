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

  if (data.frost_free) {
    return {
      zip,
      frostDate: '',
      city: data.location?.city,
      state: data.location?.state,
      stationName: data.weather_station?.name,
      probability: '50%',
      frostFree: true,
    }
  }

  const median = data.frost_dates?.first_frost_32f?.['50%']
  if (!median) {
    throw new Error('No first-frost date found for that zip.')
  }

  const frostDate = toIsoDate(median, year)
  if (!frostDate) {
    throw new Error('Could not parse first-frost date.')
  }

  return {
    zip,
    frostDate,
    city: data.location?.city,
    state: data.location?.state,
    stationName: data.weather_station?.name,
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

  // Local Vite: call upstream directly. Production: Netlify function proxy.
  if (import.meta.env.DEV) {
    const response = await fetch(
      `https://apis.joelgrant.dev/api/v1/frost/${zip}`,
    )
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? 'No frost data found for that zip code.'
          : 'Frost lookup service is unavailable. Try again or enter a date manually.',
      )
    }
    return parseFrostApiPayload(zip, await response.json())
  }

  const response = await fetch(`/api/frost?zip=${encodeURIComponent(zip)}`)
  const payload = (await response.json()) as FrostLookupResult & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Could not look up frost date for that zip.')
  }

  return {
    zip,
    frostDate: payload.frostDate || '',
    city: payload.city,
    state: payload.state,
    stationName: payload.stationName,
    probability: '50%',
    frostFree: Boolean(payload.frostFree),
  }
}
