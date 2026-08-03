import {
  addDays,
  daysBetween,
  type PlantingSchedule,
} from './schedule'

export type CalendarActionKind = 'direct-sow' | 'transplant' | 'start-indoors'

export interface CalendarBar {
  kind: CalendarActionKind
  label: string
  start: Date
  end: Date
  leftPct: number
  widthPct: number
}

export interface CalendarRow {
  schedule: PlantingSchedule
  bars: CalendarBar[]
}

export interface TimelineMarker {
  id: string
  label: string
  date: Date
  leftPct: number
}

export interface MonthTick {
  label: string
  leftPct: number
}

export interface PlantingTimeline {
  rangeStart: Date
  rangeEnd: Date
  totalDays: number
  months: MonthTick[]
  markers: TimelineMarker[]
  rows: CalendarRow[]
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function clampDate(date: Date, min: Date, max: Date): Date {
  if (date.getTime() < min.getTime()) return min
  if (date.getTime() > max.getTime()) return max
  return date
}

function toPct(date: Date, rangeStart: Date, totalDays: number): number {
  if (totalDays <= 0) return 0
  const offset = daysBetween(rangeStart, date)
  return Math.min(100, Math.max(0, (offset / totalDays) * 100))
}

function barGeometry(
  start: Date,
  end: Date,
  rangeStart: Date,
  rangeEnd: Date,
  totalDays: number,
): { leftPct: number; widthPct: number } | null {
  const clippedStart = clampDate(start, rangeStart, rangeEnd)
  const clippedEnd = clampDate(end, rangeStart, rangeEnd)
  if (clippedStart.getTime() > clippedEnd.getTime()) return null

  const leftPct = toPct(clippedStart, rangeStart, totalDays)
  const rightPct = toPct(addDays(clippedEnd, 1), rangeStart, totalDays)
  const widthPct = Math.max(rightPct - leftPct, 0.8)
  return { leftPct, widthPct }
}

/**
 * Builds a season strip from today (or the earliest open action) through
 * first frost + a short buffer so every remaining planting window fits.
 */
export function buildPlantingTimeline(
  schedules: PlantingSchedule[],
  firstFrostDate: Date,
  today: Date = new Date(),
): PlantingTimeline {
  const now = new Date(today)
  now.setHours(0, 0, 0, 0)
  const frost = new Date(firstFrostDate)
  frost.setHours(0, 0, 0, 0)

  const candidateEnds: Date[] = [addDays(frost, 21)]
  const candidateStarts: Date[] = [now]

  for (const schedule of schedules) {
    if (schedule.directSow.hasValidWindow || schedule.status === 'too-warm') {
      candidateStarts.push(schedule.directSow.earliest)
      candidateEnds.push(schedule.directSow.latest)
    }
    if (schedule.transplant) {
      candidateStarts.push(schedule.transplant.indoor.earliest)
      candidateStarts.push(schedule.transplant.startIndoorsNatural)
      candidateEnds.push(schedule.transplant.outdoor.latest)
      if (
        schedule.transplant.outdoor.hasValidWindow ||
        schedule.status === 'too-warm'
      ) {
        candidateStarts.push(schedule.transplant.outdoor.earliest)
      }
      if (
        schedule.transplant.indoor.hasValidWindow ||
        schedule.status === 'too-warm' ||
        schedule.status === 'upcoming'
      ) {
        candidateEnds.push(schedule.transplant.indoor.latest)
      }
    }
    candidateEnds.push(schedule.effectiveSeasonEnd)
  }

  let rangeStart = candidateStarts.reduce((min, d) =>
    d.getTime() < min.getTime() ? d : min,
  )
  // Keep the strip starting near today so past closed windows don’t dominate
  if (daysBetween(rangeStart, now) > 14) {
    rangeStart = addDays(now, -7)
  }
  rangeStart = startOfMonth(rangeStart)

  let rangeEnd = candidateEnds.reduce((max, d) =>
    d.getTime() > max.getTime() ? d : max,
  )
  if (rangeEnd.getTime() <= rangeStart.getTime()) {
    rangeEnd = addDays(rangeStart, 90)
  }

  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1)

  const months: MonthTick[] = []
  let cursor = startOfMonth(rangeStart)
  while (cursor.getTime() <= rangeEnd.getTime()) {
    months.push({
      label: cursor.toLocaleDateString(undefined, {
        month: 'short',
        year:
          cursor.getFullYear() !== rangeStart.getFullYear()
            ? '2-digit'
            : undefined,
      }),
      leftPct: toPct(cursor, rangeStart, totalDays),
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  const markers: TimelineMarker[] = [
    {
      id: 'today',
      label: 'Today',
      date: now,
      leftPct: toPct(now, rangeStart, totalDays),
    },
    {
      id: 'frost',
      label: 'First frost',
      date: frost,
      leftPct: toPct(frost, rangeStart, totalDays),
    },
  ]

  const rows: CalendarRow[] = schedules.map((schedule) => {
    const bars: CalendarBar[] = []

    const showDirect =
      schedule.directSow.hasValidWindow ||
      schedule.status === 'too-warm' ||
      schedule.status === 'plant-now' ||
      schedule.status === 'upcoming'

    if (showDirect && schedule.directSow.earliest <= schedule.directSow.latest) {
      const geo = barGeometry(
        schedule.directSow.earliest,
        schedule.directSow.latest,
        rangeStart,
        rangeEnd,
        totalDays,
      )
      if (geo) {
        bars.push({
          kind: 'direct-sow',
          label: 'Direct sow',
          start: schedule.directSow.earliest,
          end: schedule.directSow.latest,
          ...geo,
        })
      }
    }

    if (schedule.transplant) {
      const showIndoor =
        schedule.transplant.indoor.hasValidWindow ||
        schedule.status === 'too-warm' ||
        schedule.status === 'plant-now' ||
        schedule.status === 'upcoming'

      if (showIndoor) {
        const indoorGeo = barGeometry(
          schedule.transplant.indoor.earliest,
          schedule.transplant.indoor.latest,
          rangeStart,
          rangeEnd,
          totalDays,
        )
        if (indoorGeo) {
          bars.push({
            kind: 'start-indoors',
            label: 'Start indoors',
            start: schedule.transplant.indoor.earliest,
            end: schedule.transplant.indoor.latest,
            ...indoorGeo,
          })
        }
      }

      const showTransplant =
        schedule.transplant.outdoor.hasValidWindow ||
        schedule.status === 'too-warm' ||
        schedule.status === 'plant-now' ||
        schedule.status === 'upcoming'

      if (showTransplant) {
        const geo = barGeometry(
          schedule.transplant.outdoor.earliest,
          schedule.transplant.outdoor.latest,
          rangeStart,
          rangeEnd,
          totalDays,
        )
        if (geo) {
          bars.push({
            kind: 'transplant',
            label: 'Transplant out',
            start: schedule.transplant.outdoor.earliest,
            end: schedule.transplant.outdoor.latest,
            ...geo,
          })
        }
      }
    }

    return { schedule, bars }
  })

  // Active plantings first, then by earliest bar / ideal date
  rows.sort((a, b) => {
    const aClosed =
      a.schedule.status === 'window-closed' || a.schedule.status === 'no-window'
    const bClosed =
      b.schedule.status === 'window-closed' || b.schedule.status === 'no-window'
    if (aClosed !== bClosed) return aClosed ? 1 : -1

    const aStart = a.bars[0]?.start?.getTime() ?? a.schedule.idealPlantDate.getTime()
    const bStart = b.bars[0]?.start?.getTime() ?? b.schedule.idealPlantDate.getTime()
    return aStart - bStart
  })

  return { rangeStart, rangeEnd, totalDays, months, markers, rows }
}
