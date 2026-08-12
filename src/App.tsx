import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import {
  CATEGORY_LABELS,
  HARDINESS_LABELS,
  SEASON_EXTENDER_DAYS,
  type PlantCategory,
} from './data/plants'
import {
  calculateAllSchedules,
  formatDate,
  formatShortDate,
  formatWindow,
  STATUS_LABELS,
  type PlantStatus,
  type PlantingSchedule,
} from './lib/schedule'
import { frostFreeProxyDate, lookupFrostByZip } from './lib/frostLookup'
import { PlantingCalendar } from './components/PlantingCalendar'
import './App.css'

function defaultFrostDate(): string {
  const year = new Date().getFullYear()
  // Mid-October is a common temperate first-frost default
  return `${year}-10-15`
}

const STATUS_ORDER: PlantStatus[] = [
  'plant-now',
  'upcoming',
  'too-warm',
  'window-closed',
  'no-window',
]

type ViewMode = 'calendar' | 'details'

function BloomaLogo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <a
      className={`blooma-logo blooma-logo--${size}`}
      href="https://bloomagrows.com"
      target="_blank"
      rel="noreferrer"
    >
      <img src="/blooma-icon.svg" alt="" width={48} height={48} />
      <span>Blooma</span>
    </a>
  )
}

function App() {
  const [frostDate, setFrostDate] = useState(defaultFrostDate)
  const [zipCode, setZipCode] = useState('')
  const [zipStatus, setZipStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [zipMessage, setZipMessage] = useState('')
  const [seasonExtenders, setSeasonExtenders] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<PlantCategory | 'all'>(
    'all',
  )
  const [statusFilter, setStatusFilter] = useState<PlantStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  const schedules = useMemo(() => {
    if (!frostDate) return []
    const frost = new Date(`${frostDate}T12:00:00`)
    return calculateAllSchedules(frost, seasonExtenders)
  }, [frostDate, seasonExtenders])

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (categoryFilter !== 'all' && s.plant.category !== categoryFilter) {
        return false
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [schedules, categoryFilter, statusFilter])

  const plantNowCount = schedules.filter((s) => s.status === 'plant-now').length

  async function handleZipLookup(event: FormEvent) {
    event.preventDefault()
    setZipStatus('loading')
    setZipMessage('')
    try {
      const result = await lookupFrostByZip(zipCode)
      const place = [result.city, result.state].filter(Boolean).join(', ')

      if (result.frostFree || !result.frostDate) {
        const proxy = result.frostDate || frostFreeProxyDate()
        setFrostDate(proxy)
        setZipStatus('success')
        setZipMessage(
          place
            ? `${place} is typically frost-free. Using Dec 31 as a planning date so your planting windows still populate — adjust if nights dip near freezing.`
            : 'That area is typically frost-free. Using Dec 31 as a planning date so your planting windows still populate — adjust if needed.',
        )
        return
      }

      setFrostDate(result.frostDate)
      setZipStatus('success')
      setZipMessage(
        place
          ? `Using the average (50%) first frost for ${place}, based on NOAA climate normals. You can still adjust the date.`
          : 'Using the average (50%) first frost from NOAA climate normals. You can still adjust the date.',
      )
    } catch (error) {
      setZipStatus('error')
      setZipMessage(
        error instanceof Error ? error.message : 'ZIP lookup failed.',
      )
    }
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden="true">
        <div className="atmosphere__glow atmosphere__glow--a" />
        <div className="atmosphere__glow atmosphere__glow--b" />
        <div className="atmosphere__rows" />
      </div>

      <header className="hero">
        <BloomaLogo size="lg" />
        <h1 className="hero__brand">Fall Garden Planting Calendar</h1>
        <p className="hero__lede">
          Enter your ZIP code or frost date and see when each fall crop should
          go in the ground, accounting for heat bolting, days to harvest, and
          how hardy each plant is past frost.
        </p>

        <form
          className="hero__controls"
          onSubmit={handleZipLookup}
        >
          <div className="zip-row">
            <label className="field">
              <span className="field__label">ZIP code</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                placeholder="e.g. 10001"
                value={zipCode}
                onChange={(e) => {
                  setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))
                  if (zipStatus !== 'idle') {
                    setZipStatus('idle')
                    setZipMessage('')
                  }
                }}
                autoComplete="postal-code"
              />
            </label>
            <button
              type="submit"
              className="zip-lookup"
              disabled={zipStatus === 'loading' || zipCode.length !== 5}
            >
              {zipStatus === 'loading' ? 'Looking up…' : 'Look up frost date'}
            </button>
          </div>

          {zipMessage ? (
            <p
              className={`zip-message zip-message--${zipStatus}`}
              role="status"
            >
              {zipMessage}
            </p>
          ) : null}

          <label className="field">
            <span className="field__label">First frost date</span>
            <input
              type="date"
              value={frostDate}
              onChange={(e) => setFrostDate(e.target.value)}
              required
            />
            <span className="field__hint">
              Auto-filled from ZIP using the NOAA average (50% chance of 32°F).
              You can still edit it.
            </span>
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={seasonExtenders}
              onChange={(e) => setSeasonExtenders(e.target.checked)}
            />
            <span className="toggle__ui" aria-hidden="true" />
            <span className="toggle__copy">
              <strong>Season extenders</strong>
              <small>
                Greenhouse, low tunnels, or heavy covers — adds about{' '}
                {SEASON_EXTENDER_DAYS / 7} weeks of grow/harvest time after frost
                (doesn’t move planting dates later)
              </small>
            </span>
          </label>
        </form>
      </header>

      <main className="main">
        <section className="summary" aria-live="polite">
          <div className="summary__item">
            <span className="summary__value">{schedules.length}</span>
            <span className="summary__label">Fall crops tracked</span>
          </div>
          <div className="summary__item">
            <span className="summary__value">{plantNowCount}</span>
            <span className="summary__label">Ready to plant now</span>
          </div>
          <div className="summary__item">
            <span className="summary__value">
              {seasonExtenders ? `+${SEASON_EXTENDER_DAYS}d` : 'Open air'}
            </span>
            <span className="summary__label">Season end assumption</span>
          </div>
        </section>

        <section className="toolbar">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === 'calendar' ? 'is-active' : undefined}
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </button>
            <button
              type="button"
              className={viewMode === 'details' ? 'is-active' : undefined}
              onClick={() => setViewMode('details')}
            >
              Crop details
            </button>
          </div>

          <label className="field field--compact">
            <span className="field__label">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as PlantCategory | 'all')
              }
            >
              <option value="all">All crops</option>
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--compact">
            <span className="field__label">Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as PlantStatus | 'all')
              }
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </section>

        {viewMode === 'calendar' ? (
          <PlantingCalendar schedules={filtered} frostDate={frostDate} />
        ) : (
          <section className="plant-list" aria-label="Planting schedule">
            {filtered.map((schedule, index) => (
              <PlantRow
                key={schedule.plant.id}
                schedule={schedule}
                style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              />
            ))}
            {filtered.length === 0 && (
              <p className="empty">No plants match these filters.</p>
            )}
          </section>
        )}

        <section className="how">
          <h2>How the dates are calculated</h2>
          <ol>
            <li>
              <strong>ZIP lookup</strong> pulls the average (50%) first 32°F
              frost from NOAA climate normals for the nearest station. In
              typically frost-free areas, Dec 31 is used as a planning
              stand-in so planting windows still populate — you can always
              override the date.
            </li>
            <li>
              <strong>Season end</strong> = first frost + how many days past
              frost the plant still grows. Planting dates always use open-air
              timing
              {seasonExtenders
                ? `; season extenders add ~${SEASON_EXTENDER_DAYS} days of grow/harvest time after frost without moving plant dates`
                : ''}
              .
            </li>
            <li>
              <strong>Direct sow</strong> = cool-enough date through season end
              minus days to harvest. Planting earlier risks heat stress and
              bolting.
            </li>
            <li>
              <strong>Transplants</strong> = outdoor set-out window, plus a
              matching indoor-start window that begins 2–3 weeks before
              transplant start and ends 2–3 weeks before transplant end
              (everything except root crops).
            </li>
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        <BloomaLogo size="md" />
        <p>Grown with care for fall gardens.</p>
      </footer>
    </div>
  )
}

function PlantRow({
  schedule,
  style,
}: {
  schedule: PlantingSchedule
  style?: CSSProperties
}) {
  const { plant, status, directSow, transplant } = schedule

  return (
    <article className={`plant status-${status}`} style={style}>
      <div className="plant__top">
        <div>
          <p className="plant__category">{CATEGORY_LABELS[plant.category]}</p>
          <h3>{plant.name}</h3>
          <p className="plant__method">
            {transplant
              ? 'Direct sow outdoors, or start indoors and transplant.'
              : 'Direct sow only — root crops don’t transplant well.'}
          </p>
        </div>
        <span className={`badge badge--${status}`}>
          {status === 'plant-now' && <span className="badge__dot" />}
          {STATUS_LABELS[status]}
        </span>
      </div>

      <dl className="plant__meta">
        <div>
          <dt>Direct sow window</dt>
          <dd>
            {status === 'window-closed' && !directSow.hasValidWindow ? (
              <>
                Closed ({formatShortDate(schedule.coolEnoughDate)} –{' '}
                {formatShortDate(directSow.latest)})
              </>
            ) : directSow.hasValidWindow || status === 'too-warm' ? (
              formatWindow(directSow)
            ) : (
              'No workable direct-sow window'
            )}
          </dd>
        </div>
        <div>
          <dt>Ideal direct sow</dt>
          <dd>{formatDate(directSow.ideal)}</dd>
        </div>

        {transplant ? (
          <>
            <div>
              <dt>Start indoors window</dt>
              <dd>
                {transplant.indoor.hasValidWindow || status === 'too-warm' ? (
                  formatWindow(transplant.indoor)
                ) : status === 'window-closed' ? (
                  <>
                    Closed ({formatShortDate(transplant.startIndoorsNatural)} –{' '}
                    {formatShortDate(transplant.indoor.latest)})
                  </>
                ) : (
                  'No workable indoor-start window'
                )}
                <span className="plant__sub">
                  ~{Math.round(transplant.indoorLeadDays / 7)} weeks before the
                  transplant-out window
                </span>
              </dd>
            </div>
            <div>
              <dt>Ideal start indoors</dt>
              <dd>{formatDate(transplant.indoor.ideal)}</dd>
            </div>
            <div>
              <dt>Transplant out window</dt>
              <dd>
                {transplant.outdoor.hasValidWindow || status === 'too-warm' ? (
                  formatWindow(transplant.outdoor)
                ) : status === 'window-closed' ? (
                  <>
                    Closed ({formatShortDate(schedule.coolEnoughDate)} –{' '}
                    {formatShortDate(transplant.outdoor.latest)})
                  </>
                ) : (
                  'No workable transplant window'
                )}
              </dd>
            </div>
            <div>
              <dt>Ideal transplant out</dt>
              <dd>{formatDate(transplant.outdoor.ideal)}</dd>
            </div>
          </>
        ) : null}

        <div>
          <dt>Days to harvest</dt>
          <dd>~{plant.daysToHarvest} days</dd>
        </div>
        <div>
          <dt>Expected harvest</dt>
          <dd>{formatDate(schedule.expectedHarvestDate)}</dd>
        </div>
        <div>
          <dt>Frost hardiness</dt>
          <dd>
            {HARDINESS_LABELS[plant.frostHardiness]}
            <span className="plant__sub">
              Grows ~{schedule.effectiveDaysPastFrost} days past frost
              {schedule.effectiveDaysPastFrost > plant.daysPastFrost
                ? ' (incl. extenders)'
                : ''}
            </span>
          </dd>
        </div>
        <div>
          <dt>Too warm outdoors before</dt>
          <dd>{formatDate(schedule.coolEnoughDate)}</dd>
        </div>
      </dl>

      <p className="plant__notes">{plant.notes}</p>
    </article>
  )
}

export default App
