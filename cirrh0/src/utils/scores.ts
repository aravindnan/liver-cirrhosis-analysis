// Guideline scores, computed in the browser for the what-if tool and the "what changed" view.
// The cut-offs and formulas mirror cirrh0-backend/utils/scores.js, which is the version that scores
// saved reports. A test pins the two together on known values.

export type Band = 'low' | 'intermediate' | 'high'

export const THRESHOLDS = {
  fib4: { low: 1.3, lowFrom65: 2.0, high: 2.67 },
  apri: { low: 0.5, high: 2.0 },
  albi: { grade1: -2.6, grade2: -1.39 },
}

const AST_ULN = 40
const BILIRUBIN_MGDL_TO_UMOLL = 17.104
const round = (n: number) => Number(n.toFixed(2))

export const fib4 = (age: number, ast: number, alt: number, platelets: number) =>
  round((age * ast) / (platelets * Math.sqrt(alt)))

export const fib4Band = (value: number, age: number): Band => {
  const lowCutoff = age >= 65 ? THRESHOLDS.fib4.lowFrom65 : THRESHOLDS.fib4.low
  return value < lowCutoff ? 'low' : value > THRESHOLDS.fib4.high ? 'high' : 'intermediate'
}

export const apri = (ast: number, platelets: number) => round((ast / AST_ULN / platelets) * 100)

export const apriBand = (value: number): Band =>
  value < THRESHOLDS.apri.low ? 'low' : value > THRESHOLDS.apri.high ? 'high' : 'intermediate'

export const albi = (bilirubinMgDl: number, albuminGdL: number) =>
  round(0.66 * Math.log10(bilirubinMgDl * BILIRUBIN_MGDL_TO_UMOLL) - 0.085 * (albuminGdL * 10))

export const albiGrade = (value: number): 1 | 2 | 3 =>
  value <= THRESHOLDS.albi.grade1 ? 1 : value <= THRESHOLDS.albi.grade2 ? 2 : 3

export const albiBand = (value: number): Band => (['low', 'intermediate', 'high'] as const)[albiGrade(value) - 1]

// "What changed": FIB-4 is a product of powers, so the change between two tests splits exactly on a
// log scale into the part each lab explains. Age is not stored with a trend point, so whatever the three
// labs do not explain is reported as "age and rounding".
export type Fib4Labs = { sgot: number | null; alt: number | null; platelets: number | null }
export type Driver = { label: string; share: number }

export const fib4Drivers = (from: Fib4Labs, to: Fib4Labs, fromValue: number, toValue: number): Driver[] | null => {
  const labs = [from.sgot, from.alt, from.platelets, to.sgot, to.alt, to.platelets]
  if (labs.some((v) => v === null || !(v > 0)) || !(fromValue > 0) || !(toValue > 0)) return null
  const f = from as Required<{ [K in keyof Fib4Labs]: number }>
  const t = to as Required<{ [K in keyof Fib4Labs]: number }>
  const total = Math.log(toValue / fromValue)
  const ast = Math.log(t.sgot / f.sgot)
  const alt = -0.5 * Math.log(t.alt / f.alt)
  const plt = -Math.log(t.platelets / f.platelets)
  const rest = total - ast - alt - plt
  const toPercent = (log: number) => (Math.exp(log) - 1) * 100
  // Each driver is shown as "what FIB-4 would have done had only this lab moved".
  return [
    { label: 'Platelets', share: toPercent(plt) },
    { label: 'AST', share: toPercent(ast) },
    { label: 'ALT', share: toPercent(alt) },
    { label: 'Age and rounding', share: toPercent(rest) },
  ]
}

// Which published next step usually follows an FIB-4 band. This is the non-invasive testing pathway in
// AASLD and EASL guidance, simplified; it is information to discuss with a doctor, not advice.
export const PATHWAY = [
  {
    id: 'screen',
    title: 'Blood test: FIB-4',
    body: 'A simple score from age, AST, ALT and platelets. It is the usual first step and costs nothing extra if you already have a liver panel.',
  },
  {
    id: 'confirm',
    title: 'Second test: elastography or ELF',
    body: 'A scan that measures how stiff the liver is (FibroScan), or a second blood test. Suggested when FIB-4 is in the middle band.',
  },
  {
    id: 'specialist',
    title: 'See a liver specialist',
    body: 'A hepatologist decides on further imaging, cause-specific treatment and monitoring. Suggested when FIB-4 or the second test points to advanced scarring.',
  },
] as const

export const pathwayStepFor = (band: Band): (typeof PATHWAY)[number]['id'] =>
  band === 'low' ? 'screen' : band === 'intermediate' ? 'confirm' : 'specialist'

export const doctorScript = (band: Band) =>
  ({
    low: 'My FIB-4 score was in the low-risk range. How often should I have my liver blood tests repeated?',
    intermediate: 'My FIB-4 score was in the indeterminate range. Should I have an elastography scan to check for scarring?',
    high: 'My FIB-4 score was in the high-risk range. Can I be referred to a liver specialist for further tests?',
  })[band]
