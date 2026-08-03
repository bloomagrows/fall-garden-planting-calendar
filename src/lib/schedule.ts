import {
  FALL_PLANTS,
  SEASON_EXTENDER_DAYS,
  type FallPlant,
  type PlantCategory,
} from '../data/plants'

export type PlantStatus =
  | 'plant-now'
  | 'too-warm'
  | 'upcoming'
  | 'window-closed'
  | 'no-window'

export interface DateWindow {
  earliest: Date
  latest: Date
  ideal: Date
  /** True when some recommended dates remain from today forward */
  hasValidWindow: boolean
}

export interface TransplantPlan {
  indoorLeadDays: number
  /**
   * Indoor seed-start window = transplant-out window shifted earlier by
   * indoorLeadDays (start 2–3 weeks before transplant start; end 2–3 weeks
   * before transplant end).
   */
  indoor: DateWindow
  /** Convenience alias for indoor.ideal */
  startIndoors: Date
  /** Natural (unclamped) start of the indoor window */
  startIndoorsNatural: Date
  outdoor: DateWindow
  /** Indoor start window is still open from today forward */
  canStartIndoorsNow: boolean
}

export interface PlantingSchedule {
  plant: FallPlant
  /** When outdoor conditions are typically cool enough (may be before today) */
  coolEnoughDate: Date
  effectiveSeasonEnd: Date
  effectiveDaysPastFrost: number
  directSow: DateWindow
  /** Null for root crops — transplanting is not recommended */
  transplant: TransplantPlan | null
  expectedHarvestDate: Date
  status: PlantStatus
  hasValidWindow: boolean
  /** @deprecated Prefer directSow / transplant — kept for summary sorting */
  idealPlantDate: Date
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = startOfDay(date)
  d.setDate(d.getDate() + days)
  return d
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatWindow(window: DateWindow): string {
  return `${formatShortDate(window.earliest)} – ${formatShortDate(window.latest)}`
}

/** Root crops are direct-sown; everything else can be started indoors. */
export function canStartIndoors(plant: FallPlant): boolean {
  return plant.category !== 'roots'
}

/** Weeks indoors before transplanting out (2–3 weeks). */
const INDOOR_LEAD_DAYS: Record<PlantCategory, number> = {
  greens: 14,
  brassicas: 21,
  roots: 0,
  alliums: 18,
  herbs: 18,
  legumes: 14,
}

function buildWindow(
  naturalEarliest: Date,
  naturalLatest: Date,
  now: Date,
): DateWindow {
  const naturalOk = naturalEarliest.getTime() <= naturalLatest.getTime()
  const stillOpen = naturalOk && now.getTime() <= naturalLatest.getTime()

  const earliest = stillOpen
    ? now.getTime() > naturalEarliest.getTime()
      ? now
      : naturalEarliest
    : naturalEarliest

  const hasValidWindow =
    naturalOk && stillOpen && earliest.getTime() <= naturalLatest.getTime()

  let ideal = hasValidWindow
    ? addDays(
        earliest,
        Math.floor(daysBetween(earliest, naturalLatest) / 2),
      )
    : naturalLatest

  if (hasValidWindow && ideal.getTime() < now.getTime()) {
    ideal = now
  }

  return {
    earliest,
    latest: naturalLatest,
    ideal,
    hasValidWindow,
  }
}

/**
 * Fall planting math (per plant):
 *
 * Direct sow:
 * 1. Open-air season end = first frost + frost hardiness (planting math)
 * 2. Latest sow = open-air season end − days to harvest
 * 3. Earliest sow = cool-enough date (heat / bolting risk before this)
 * 4. Season extenders lengthen grow/harvest after frost only — they do not
 *    move outdoor planting dates later
 *
 * Transplant (all except roots):
 * 1. Outdoor transplant window from cool-enough through season math
 * 2. Indoor start window = that same outdoor window shifted earlier by
 *    2–3 weeks (begins 2–3 weeks before transplant start; ends 2–3 weeks
 *    before transplant end)
 *
 * Recommended dates are never earlier than today while a window remains open.
 */
export function calculateSchedule(
  plant: FallPlant,
  firstFrostDate: Date,
  useSeasonExtenders: boolean,
  today: Date = new Date(),
): PlantingSchedule {
  const frost = startOfDay(firstFrostDate)
  const now = startOfDay(today)

  const extenderBonus = useSeasonExtenders ? SEASON_EXTENDER_DAYS : 0
  // Planting windows stay tied to unprotected frost timing
  const openAirSeasonEnd = addDays(frost, plant.daysPastFrost)
  // Extenders only push the backend grow/harvest season further past frost
  const effectiveDaysPastFrost = plant.daysPastFrost + extenderBonus
  const effectiveSeasonEnd = addDays(frost, effectiveDaysPastFrost)

  let coolEnoughDate: Date
  let directSowLatestNatural: Date

  if (plant.plantRelativeToFrost) {
    coolEnoughDate = addDays(
      frost,
      -plant.plantRelativeToFrost.daysBeforeFrost,
    )
    directSowLatestNatural = addDays(
      frost,
      plant.plantRelativeToFrost.daysAfterFrost,
    )
  } else {
    coolEnoughDate = addDays(frost, -plant.coolEnoughDaysBeforeFrost)
    directSowLatestNatural = addDays(openAirSeasonEnd, -plant.daysToHarvest)
  }

  const directSow = buildWindow(coolEnoughDate, directSowLatestNatural, now)

  let transplant: TransplantPlan | null = null

  if (canStartIndoors(plant)) {
    const indoorLeadDays = INDOOR_LEAD_DAYS[plant.category]
    const outdoorDaysNeeded = plant.plantRelativeToFrost
      ? 0
      : Math.max(plant.daysToHarvest - indoorLeadDays, 14)

    const transplantEarliestNatural = coolEnoughDate
    const transplantLatestNatural = plant.plantRelativeToFrost
      ? directSowLatestNatural
      : addDays(openAirSeasonEnd, -outdoorDaysNeeded)

    const outdoor = buildWindow(
      transplantEarliestNatural,
      transplantLatestNatural,
      now,
    )

    // Indoor window mirrors transplant-out, shifted earlier by lead time
    const indoorEarliestNatural = addDays(
      transplantEarliestNatural,
      -indoorLeadDays,
    )
    const indoorLatestNatural = addDays(
      transplantLatestNatural,
      -indoorLeadDays,
    )
    const indoor = buildWindow(
      indoorEarliestNatural,
      indoorLatestNatural,
      now,
    )

    const canStartIndoorsNow =
      indoor.hasValidWindow &&
      now.getTime() >= indoorEarliestNatural.getTime()

    transplant = {
      indoorLeadDays,
      indoor,
      startIndoors: indoor.ideal,
      startIndoorsNatural: indoorEarliestNatural,
      outdoor,
      canStartIndoorsNow,
    }
  }

  const hasValidWindow =
    directSow.hasValidWindow ||
    Boolean(transplant?.outdoor.hasValidWindow) ||
    Boolean(transplant?.indoor.hasValidWindow)

  const expectedHarvestDate = addDays(
    directSow.hasValidWindow
      ? directSow.ideal
      : transplant?.outdoor.hasValidWindow
        ? transplant.outdoor.ideal
        : directSow.ideal,
    plant.daysToHarvest,
  )

  const status = resolveStatus({
    now,
    coolEnoughDate,
    directSow,
    transplant,
    naturalDirectOk:
      coolEnoughDate.getTime() <= directSowLatestNatural.getTime(),
  })

  const idealPlantDate = directSow.hasValidWindow
    ? directSow.ideal
    : transplant?.outdoor.hasValidWindow
      ? transplant.outdoor.ideal
      : transplant?.indoor.hasValidWindow
        ? transplant.indoor.ideal
        : directSow.ideal

  return {
    plant,
    coolEnoughDate,
    effectiveSeasonEnd,
    effectiveDaysPastFrost,
    directSow,
    transplant,
    expectedHarvestDate,
    status,
    hasValidWindow,
    idealPlantDate,
  }
}

function resolveStatus({
  now,
  coolEnoughDate,
  directSow,
  transplant,
  naturalDirectOk,
}: {
  now: Date
  coolEnoughDate: Date
  directSow: DateWindow
  transplant: TransplantPlan | null
  naturalDirectOk: boolean
}): PlantStatus {
  const outdoorReady =
    directSow.hasValidWindow || Boolean(transplant?.outdoor.hasValidWindow)
  const indoorWindowOpen = Boolean(transplant?.indoor.hasValidWindow)
  const indoorActionable = Boolean(transplant?.canStartIndoorsNow)
  const indoorUpcoming =
    indoorWindowOpen &&
    transplant != null &&
    now.getTime() < transplant.startIndoorsNatural.getTime()

  if (!naturalDirectOk && !transplant) {
    return 'no-window'
  }

  const indoorClosed =
    !transplant || now.getTime() > transplant.indoor.latest.getTime()
  const outdoorClosed =
    now.getTime() > directSow.latest.getTime() &&
    (!transplant || now.getTime() > transplant.outdoor.latest.getTime())

  if (
    !outdoorReady &&
    !indoorWindowOpen &&
    indoorClosed &&
    outdoorClosed
  ) {
    return 'window-closed'
  }

  if (outdoorReady || indoorWindowOpen) {
    const ideal = directSow.hasValidWindow
      ? directSow.ideal
      : transplant?.outdoor.hasValidWindow
        ? transplant.outdoor.ideal
        : transplant?.indoor.ideal

    if (indoorUpcoming && !outdoorReady) {
      return daysBetween(now, transplant!.startIndoorsNatural) > 14
        ? 'upcoming'
        : 'plant-now'
    }

    if (ideal && daysBetween(now, ideal) > 14 && !indoorActionable) {
      return 'upcoming'
    }
    return 'plant-now'
  }

  if (now.getTime() < coolEnoughDate.getTime()) {
    return 'too-warm'
  }

  return 'window-closed'
}

export function calculateAllSchedules(
  firstFrostDate: Date,
  useSeasonExtenders: boolean,
  today: Date = new Date(),
): PlantingSchedule[] {
  return FALL_PLANTS.map((plant) =>
    calculateSchedule(plant, firstFrostDate, useSeasonExtenders, today),
  ).sort((a, b) => a.idealPlantDate.getTime() - b.idealPlantDate.getTime())
}

export const STATUS_LABELS: Record<PlantStatus, string> = {
  'plant-now': 'Plant now',
  'too-warm': 'Still too warm',
  upcoming: 'Window opening soon',
  'window-closed': 'Window closed',
  'no-window': 'No valid window',
}
