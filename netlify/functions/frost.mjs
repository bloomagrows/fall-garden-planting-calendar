/**
 * Netlify function: zip → average first fall frost (NOAA Climate Normals).
 * Proxies a public frost API so the browser isn't blocked by CORS.
 */

const FROST_API = 'https://apis.joelgrant.dev/api/v1/frost'

function toIsoDate(monthDay, year) {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(String(monthDay || '').trim())
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
    },
    body: JSON.stringify(body),
  }
}

export async function handler(event) {
  const zip = String(event.queryStringParameters?.zip || '')
    .replace(/\D/g, '')
    .slice(0, 5)

  if (zip.length !== 5) {
    return json(400, { error: 'Enter a 5-digit US zip code.' })
  }

  try {
    const upstream = await fetch(`${FROST_API}/${zip}`, {
      headers: { Accept: 'application/json' },
    })

    if (!upstream.ok) {
      return json(upstream.status === 404 ? 404 : 502, {
        error:
          upstream.status === 404
            ? 'No frost data found for that zip code.'
            : 'Frost lookup service is unavailable. Try again or enter a date manually.',
      })
    }

    const body = await upstream.json()
    const data = body?.data
    if (!data) {
      return json(502, { error: 'Unexpected frost API response.' })
    }

    if (data.frost_free) {
      return json(200, {
        zip,
        frostDate: '',
        frostFree: true,
        city: data.location?.city,
        state: data.location?.state,
        stationName: data.weather_station?.name,
        probability: '50%',
        error:
          'This zip is typically frost-free — enter a frost date manually if you still want a schedule.',
      })
    }

    const median = data.frost_dates?.first_frost_32f?.['50%']
    const year = new Date().getFullYear()
    const frostDate = toIsoDate(median, year)
    if (!frostDate) {
      return json(502, { error: 'Could not parse first-frost date.' })
    }

    return json(200, {
      zip,
      frostDate,
      city: data.location?.city,
      state: data.location?.state,
      stationName: data.weather_station?.name,
      probability: '50%',
    })
  } catch {
    return json(502, {
      error:
        'Frost lookup service is unavailable. Try again or enter a date manually.',
    })
  }
}
