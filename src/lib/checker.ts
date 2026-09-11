export type Language = 'en' | 'he'
export type Localized = Record<Language, string>
export type Variant = 'unknown' | 'Y7CR' | 'other'
export type Replacement = 'unknown' | 'no' | 'yes'
export type Status = 'candidate' | 'outside' | 'document-supported' | 'conflicting' | 'unknown'

export const RESEARCH_DATE = '2026-09-11'
export const SOURCES = [
  {
    title: { en: 'Tesla: 2020–2024 VIN decoding', he: 'טסלה: פענוח VIN לשנים 2020–2024' },
    url: 'https://service.tesla.com/docs/ModelY/ServiceManual/en-us/GUID-0C797294-574D-4EE4-8017-C339A7D58411.html',
    kind: { en: 'Manufacturer documentation', he: 'תיעוד יצרן' },
  },
  {
    title: { en: 'Y7CR and the BYD structural pack', he: 'Y7CR ומארז הסוללה המבני של BYD' },
    url: 'https://teslamag.de/news/exklusiv-tesla-eu-genehmigung-model-y-strukturellem-akku-byd-51652',
    kind: { en: 'Reporting based on approval documents', he: 'דיווח המבוסס על מסמכי תקינה' },
  },
  {
    title: { en: 'Taiwan: reported structural-pack replacement', he: 'טייוואן: דיווח על החלפת מארז מבני' },
    url: 'https://www.car-safety.org.tw/car_safety/Ajax_GetCarBrokeDescs?id=15844',
    kind: { en: 'Owner submission on official safety register', he: 'דיווח בעלים במאגר בטיחות רשמי' },
  },
  {
    title: { en: 'Tesla: battery alert definitions', he: 'טסלה: הגדרות התראות הסוללה' },
    url: 'https://www.tesla.com/ownersmanual/2020_2024_modely/en_eu/GUID-9A3F0F72-71F4-433D-B68B-0A472A9359DF.html',
    kind: { en: 'Manufacturer documentation', he: 'תיעוד יצרן' },
  },
] satisfies { title: Localized; url: string; kind: Localized }[]

export class InputError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.name = 'InputError'
    this.code = code
  }
}

export function normalizeVin(input: string): string {
  const vin = input.trim().toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new InputError('invalid_vin')
  if (['XP7', 'LRW', '5YJ', '7SA'].includes(vin.slice(0, 3)) && !/^\d{6}$/.test(vin.slice(11))) throw new InputError('invalid_vin')
  return vin
}

export function normalizePlate(input: string): string {
  const value = input.trim()
  if (!/^[0-9 -]+$/.test(value)) throw new InputError('invalid_plate')
  const digits = value.replace(/[ -]/g, '')
  if (!/^[0-9]{5,8}$/.test(digits) || Number(digits) === 0) throw new InputError('invalid_plate')
  return String(Number(digits))
}

const yearCodes: Record<string, number> = { L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026 }
const manufacturers = new Set(['XP7', 'LRW', '5YJ', '7SA'])
const singleMotor = new Set(['D', 'J', 'R', 'S'])
const dualMotor = new Set(['E', 'F', 'K', 'L'])
const plants: Record<string, string> = { A: 'Austin', B: 'Berlin', C: 'Shanghai', F: 'Fremont' }

export interface DecodedVin {
  vin: string
  supported: boolean
  model: string | null
  factory: string | null
  year: number | null
  drive: 'rwd' | 'awd' | 'unknown'
  chemistry: 'lfp' | 'nickel' | 'unknown'
  conflict: boolean
}

export function decodeVin(input: string): DecodedVin {
  const vin = normalizeVin(input)
  const wmi = vin.slice(0, 3)
  const supported = manufacturers.has(wmi)
  const model = supported ? ({ Y: 'Model Y', '3': 'Model 3', S: 'Model S', X: 'Model X' }[vin[3]] ?? null) : null
  const year = supported ? yearCodes[vin[9]] ?? null : null
  const factory = supported ? plants[vin[10]] ?? null : null
  const expectedPlants = wmi === 'XP7' ? ['B'] : wmi === 'LRW' ? ['C'] : ['A', 'F']
  const conflict = supported && !expectedPlants.includes(vin[10])
  // Only apply the inspected historical drive table to its model/generation.
  const historicalY = model === 'Model Y' && year !== null && year <= 2024
  const drive = historicalY && singleMotor.has(vin[7]) ? 'rwd'
    : historicalY && dualMotor.has(vin[7]) ? 'awd' : 'unknown'
  const chemistry = historicalY && wmi === 'LRW'
    ? vin[6] === 'F' ? 'lfp' : vin[6] === 'E' ? 'nickel' : 'unknown'
    : 'unknown'
  return { vin, supported, model, factory, year, drive, chemistry, conflict }
}

export interface Assessment {
  decoded: DecodedVin
  status: Status
  probability: number | null
  criteria: { id: 'model' | 'factory' | 'year' | 'drive'; match: boolean | null }[]
  currentPack: 'original-reported' | 'replacement-unknown' | 'unknown'
  reasons: string[]
}

export function assess(input: string, variant: Variant = 'unknown', replacement: Replacement = 'unknown'): Assessment {
  const decoded = decodeVin(input)
  const criteria: Assessment['criteria'] = [
    { id: 'model', match: decoded.model ? decoded.model === 'Model Y' : null },
    { id: 'factory', match: decoded.factory && !decoded.conflict ? decoded.factory === 'Berlin' : null },
    { id: 'year', match: decoded.year ? decoded.year >= 2023 && decoded.year <= 2024 : null },
    { id: 'drive', match: decoded.drive === 'unknown' ? null : decoded.drive === 'rwd' },
  ]
  const outside = criteria.some((item) => item.match === false)
  const allMatch = criteria.every((item) => item.match === true)
  let status: Status = 'unknown'
  if (decoded.conflict || (variant === 'Y7CR' && outside)) status = 'conflicting'
  else if (outside && decoded.supported) status = 'outside'
  else if (variant === 'Y7CR' && allMatch) status = 'document-supported'
  else if (allMatch && variant !== 'other') status = 'candidate'
  const reasons = [
    'no_calibration',
    ...(decoded.factory === 'Berlin' ? ['berlin_chemistry_gap'] : []),
    ...(variant !== 'unknown' ? ['self_reported_document'] : []),
    ...(replacement !== 'no' ? ['current_pack_unknown'] : []),
  ]
  return {
    decoded, status,
    // No labeled, representative fleet dataset exists to calibrate a probability.
    probability: null,
    criteria,
    currentPack: replacement === 'no' ? 'original-reported' : replacement === 'yes' ? 'replacement-unknown' : 'unknown',
    reasons,
  }
}
