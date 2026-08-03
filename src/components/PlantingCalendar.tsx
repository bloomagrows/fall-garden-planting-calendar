import { formatShortDate, type PlantingSchedule } from '../lib/schedule'
import {
  buildPlantingTimeline,
  type CalendarActionKind,
  type CalendarBar,
} from '../lib/calendar'
import './PlantingCalendar.css'

interface PlantingCalendarProps {
  schedules: PlantingSchedule[]
  frostDate: string
}

const LANE_ORDER: CalendarActionKind[] = [
  'start-indoors',
  'direct-sow',
  'transplant',
]

function barTitle(bar: CalendarBar): string {
  return `${bar.label}: ${formatShortDate(bar.start)} – ${formatShortDate(bar.end)}`
}

export function PlantingCalendar({
  schedules,
  frostDate,
}: PlantingCalendarProps) {
  const frost = new Date(`${frostDate}T12:00:00`)
  const timeline = buildPlantingTimeline(schedules, frost)

  if (schedules.length === 0) {
    return <p className="empty">No plants match these filters.</p>
  }

  return (
    <section className="calendar" aria-label="Season planting calendar">
      <div className="calendar__intro">
        <h2>Season calendar</h2>
        <p>
          Everything you can plant from now through frost — direct sow, start
          indoors, and transplant windows on one timeline.
        </p>
      </div>

      <div className="calendar__legend" aria-hidden="true">
        <span className="calendar__swatch calendar__swatch--direct">
          Direct sow
        </span>
        <span className="calendar__swatch calendar__swatch--indoor">
          Start indoors
        </span>
        <span className="calendar__swatch calendar__swatch--transplant">
          Transplant out
        </span>
      </div>

      <div className="calendar__scroll">
        <div className="calendar__grid">
          <div className="calendar__corner" aria-hidden="true" />
          <div className="calendar__months" aria-hidden="true">
            {timeline.months.map((month) => (
              <span
                key={`${month.label}-${month.leftPct}`}
                className="calendar__month"
                style={{ left: `${month.leftPct}%` }}
              >
                {month.label}
              </span>
            ))}
            {timeline.markers.map((marker) => (
              <span
                key={marker.id}
                className={`calendar__marker-label calendar__marker-label--${marker.id}`}
                style={{ left: `${marker.leftPct}%` }}
              >
                {marker.label}
              </span>
            ))}
          </div>

          {timeline.rows.map(({ schedule, bars }) => (
            <div className="calendar__row" key={schedule.plant.id}>
              <div className="calendar__name">
                <strong>{schedule.plant.name}</strong>
                {bars.length === 0 && (
                  <span className="calendar__name-note">Window closed</span>
                )}
              </div>
              <div className="calendar__track">
                {timeline.markers.map((marker) => (
                  <span
                    key={`${schedule.plant.id}-${marker.id}`}
                    className={`calendar__line calendar__line--${marker.id}`}
                    style={{ left: `${marker.leftPct}%` }}
                    aria-hidden="true"
                  />
                ))}
                {LANE_ORDER.map((kind) => {
                  const bar = bars.find((item) => item.kind === kind)
                  if (!bar) return null
                  return (
                    <div
                      key={`${schedule.plant.id}-${bar.kind}`}
                      className={`calendar__bar calendar__bar--${bar.kind}`}
                      style={{
                        left: `${bar.leftPct}%`,
                        width: `${bar.widthPct}%`,
                      }}
                      title={barTitle(bar)}
                    >
                      <span className="calendar__bar-label">
                        {bar.kind === 'start-indoors'
                          ? 'Indoors'
                          : bar.kind === 'transplant'
                            ? 'Transplant'
                            : 'Direct sow'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
