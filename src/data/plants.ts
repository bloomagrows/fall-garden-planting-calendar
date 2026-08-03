export type PlantCategory =
  | 'greens'
  | 'brassicas'
  | 'roots'
  | 'alliums'
  | 'herbs'
  | 'legumes'

export type FrostHardiness =
  | 'tender'
  | 'light'
  | 'moderate'
  | 'hardy'
  | 'very-hardy'

export interface FallPlant {
  id: string
  name: string
  category: PlantCategory
  /** Average days from seed (or transplant) to harvest */
  daysToHarvest: number
  /**
   * How far before first frost it usually becomes cool enough to plant
   * without bolting / heat stress. Planting earlier than this is "too warm".
   */
  coolEnoughDaysBeforeFrost: number
  /**
   * How many days past the first frost date the plant typically keeps growing
   * outdoors without protection (frost hardiness).
   */
  daysPastFrost: number
  frostHardiness: FrostHardiness
  notes: string
  plantFrom: 'seed' | 'transplant' | 'seed-or-transplant'
  /**
   * Optional fixed planting window relative to first frost.
   * Used for crops like garlic that overwinter instead of finishing
   * before the season ends.
   */
  plantRelativeToFrost?: {
    daysBeforeFrost: number
    daysAfterFrost: number
  }
}

/**
 * Fall crop reference data.
 * Numbers are typical averages for temperate gardens — adjust by variety & climate.
 */
export const FALL_PLANTS: FallPlant[] = [
  {
    id: 'spinach',
    name: 'Spinach',
    category: 'greens',
    daysToHarvest: 40,
    coolEnoughDaysBeforeFrost: 70,
    daysPastFrost: 21,
    frostHardiness: 'hardy',
    notes: 'Bolts fast in heat. Better flavor after light frost.',
    plantFrom: 'seed',
  },
  {
    id: 'lettuce',
    name: 'Lettuce',
    category: 'greens',
    daysToHarvest: 45,
    coolEnoughDaysBeforeFrost: 65,
    daysPastFrost: 7,
    frostHardiness: 'light',
    notes: 'Heat makes bitter leaves and early bolts. Prefer successive sowings.',
    plantFrom: 'seed',
  },
  {
    id: 'arugula',
    name: 'Arugula',
    category: 'greens',
    daysToHarvest: 30,
    coolEnoughDaysBeforeFrost: 60,
    daysPastFrost: 10,
    frostHardiness: 'light',
    notes: 'Very quick. Warm soils turn it spicy and leggy.',
    plantFrom: 'seed',
  },
  {
    id: 'kale',
    name: 'Kale',
    category: 'brassicas',
    daysToHarvest: 55,
    coolEnoughDaysBeforeFrost: 90,
    daysPastFrost: 45,
    frostHardiness: 'very-hardy',
    notes: 'Sweeter after frost. One of the best late-season crops.',
    plantFrom: 'seed-or-transplant',
  },
  {
    id: 'collards',
    name: 'Collards',
    category: 'brassicas',
    daysToHarvest: 60,
    coolEnoughDaysBeforeFrost: 90,
    daysPastFrost: 40,
    frostHardiness: 'very-hardy',
    notes: 'Handles heat a bit better than kale, still prefers cool nights.',
    plantFrom: 'seed-or-transplant',
  },
  {
    id: 'swiss-chard',
    name: 'Swiss Chard',
    category: 'greens',
    daysToHarvest: 50,
    coolEnoughDaysBeforeFrost: 85,
    daysPastFrost: 21,
    frostHardiness: 'hardy',
    notes: 'More heat-tolerant than spinach; still a fall standout.',
    plantFrom: 'seed',
  },
  {
    id: 'mustard-greens',
    name: 'Mustard Greens',
    category: 'greens',
    daysToHarvest: 35,
    coolEnoughDaysBeforeFrost: 70,
    daysPastFrost: 14,
    frostHardiness: 'moderate',
    notes: 'Fast crop. Hot weather makes leaves overly pungent.',
    plantFrom: 'seed',
  },
  {
    id: 'broccoli',
    name: 'Broccoli',
    category: 'brassicas',
    daysToHarvest: 70,
    coolEnoughDaysBeforeFrost: 100,
    daysPastFrost: 14,
    frostHardiness: 'moderate',
    notes: 'Start transplants early enough for heads before hard freezes.',
    plantFrom: 'transplant',
  },
  {
    id: 'cabbage',
    name: 'Cabbage',
    category: 'brassicas',
    daysToHarvest: 75,
    coolEnoughDaysBeforeFrost: 105,
    daysPastFrost: 21,
    frostHardiness: 'hardy',
    notes: 'Long season — count carefully from frost. Light frost improves flavor.',
    plantFrom: 'transplant',
  },
  {
    id: 'brussels-sprouts',
    name: 'Brussels Sprouts',
    category: 'brassicas',
    daysToHarvest: 95,
    coolEnoughDaysBeforeFrost: 120,
    daysPastFrost: 35,
    frostHardiness: 'very-hardy',
    notes: 'Needs a long cool finish. Best planted mid-to-late summer.',
    plantFrom: 'transplant',
  },
  {
    id: 'cauliflower',
    name: 'Cauliflower',
    category: 'brassicas',
    daysToHarvest: 70,
    coolEnoughDaysBeforeFrost: 100,
    daysPastFrost: 7,
    frostHardiness: 'light',
    notes: 'Less cold-tolerant than broccoli; keep on schedule.',
    plantFrom: 'transplant',
  },
  {
    id: 'radish',
    name: 'Radish',
    category: 'roots',
    daysToHarvest: 28,
    coolEnoughDaysBeforeFrost: 55,
    daysPastFrost: 7,
    frostHardiness: 'light',
    notes: 'Great filler crop. Woody and pungent if sown in heat.',
    plantFrom: 'seed',
  },
  {
    id: 'beets',
    name: 'Beets',
    category: 'roots',
    daysToHarvest: 55,
    coolEnoughDaysBeforeFrost: 80,
    daysPastFrost: 21,
    frostHardiness: 'hardy',
    notes: 'Tops and roots both edible. Light frost is fine.',
    plantFrom: 'seed',
  },
  {
    id: 'carrots',
    name: 'Carrots',
    category: 'roots',
    daysToHarvest: 70,
    coolEnoughDaysBeforeFrost: 95,
    daysPastFrost: 28,
    frostHardiness: 'hardy',
    notes: 'Sweeten in cold soil. Can stay in ground past frost with mulch.',
    plantFrom: 'seed',
  },
  {
    id: 'turnips',
    name: 'Turnips',
    category: 'roots',
    daysToHarvest: 45,
    coolEnoughDaysBeforeFrost: 70,
    daysPastFrost: 21,
    frostHardiness: 'hardy',
    notes: 'Fast roots + greens. Avoid hot stretches for tender roots.',
    plantFrom: 'seed',
  },
  {
    id: 'parsnips',
    name: 'Parsnips',
    category: 'roots',
    daysToHarvest: 110,
    coolEnoughDaysBeforeFrost: 140,
    daysPastFrost: 45,
    frostHardiness: 'very-hardy',
    notes: 'Long season. Flavor peaks after hard frosts.',
    plantFrom: 'seed',
  },
  {
    id: 'garlic',
    name: 'Garlic',
    category: 'alliums',
    daysToHarvest: 240,
    coolEnoughDaysBeforeFrost: 7,
    daysPastFrost: 14,
    frostHardiness: 'very-hardy',
    notes:
      'Plant cloves about 1 week before first frost through 2 weeks after. Overwinters for mid-summer harvest.',
    plantFrom: 'seed',
    plantRelativeToFrost: {
      daysBeforeFrost: 7,
      daysAfterFrost: 14,
    },
  },
  {
    id: 'green-onions',
    name: 'Green Onions',
    category: 'alliums',
    daysToHarvest: 50,
    coolEnoughDaysBeforeFrost: 75,
    daysPastFrost: 21,
    frostHardiness: 'hardy',
    notes: 'Bunching onions handle cool weather well.',
    plantFrom: 'seed',
  },
  {
    id: 'peas',
    name: 'Peas',
    category: 'legumes',
    daysToHarvest: 60,
    coolEnoughDaysBeforeFrost: 85,
    daysPastFrost: 7,
    frostHardiness: 'light',
    notes: 'Fall peas need enough cool weather left — watch your frost date.',
    plantFrom: 'seed',
  },
  {
    id: 'cilantro',
    name: 'Cilantro',
    category: 'herbs',
    daysToHarvest: 40,
    coolEnoughDaysBeforeFrost: 65,
    daysPastFrost: 10,
    frostHardiness: 'light',
    notes: 'Classic bolt-in-heat herb. Fall is often its best season.',
    plantFrom: 'seed',
  },
  {
    id: 'parsley',
    name: 'Parsley',
    category: 'herbs',
    daysToHarvest: 70,
    coolEnoughDaysBeforeFrost: 90,
    daysPastFrost: 28,
    frostHardiness: 'hardy',
    notes: 'Slow to start; frost-hardy once established.',
    plantFrom: 'seed',
  },
  {
    id: 'asian-greens',
    name: 'Asian Greens (Bok Choy, Tatsoi)',
    category: 'greens',
    daysToHarvest: 40,
    coolEnoughDaysBeforeFrost: 70,
    daysPastFrost: 18,
    frostHardiness: 'moderate',
    notes: 'Excellent fall crop. Heat causes bolting, especially bok choy.',
    plantFrom: 'seed',
  },
]

export const SEASON_EXTENDER_DAYS = 28

export const CATEGORY_LABELS: Record<PlantCategory, string> = {
  greens: 'Greens',
  brassicas: 'Brassicas',
  roots: 'Roots',
  alliums: 'Alliums',
  herbs: 'Herbs',
  legumes: 'Legumes',
}

export const HARDINESS_LABELS: Record<FrostHardiness, string> = {
  tender: 'Tender — protect at frost',
  light: 'Light frost only',
  moderate: 'Moderate frost hardy',
  hardy: 'Frost hardy',
  'very-hardy': 'Very frost hardy',
}
