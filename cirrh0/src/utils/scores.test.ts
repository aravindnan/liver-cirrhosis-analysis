import { describe, expect, test } from 'vitest'
import { albi, albiGrade, apri, apriBand, fib4, fib4Band, fib4Drivers, pathwayStepFor } from './scores'

// The values the Render guide gives for the made-up report, and the server computes the same ones.
describe('scores match the API', () => {
  test('FIB-4 for age 55 on the guide report', () => expect(fib4(55, 40, 36, 200)).toBe(1.83))
  test('FIB-4 for age 52', () => expect(fib4(52, 40, 36, 200)).toBe(1.73))
  test('APRI', () => expect(apri(40, 200)).toBe(0.5))
  test('ALBI and grade', () => {
    expect(albi(1.2, 3.8)).toBe(-2.36)
    expect(albiGrade(-2.36)).toBe(2)
  })
})

describe('bands', () => {
  test('FIB-4 uses 2.0 as the low cut-off from age 65', () => {
    expect(fib4Band(1.6, 50)).toBe('intermediate')
    expect(fib4Band(1.6, 66)).toBe('low')
    expect(fib4Band(2.7, 50)).toBe('high')
  })
  test('APRI at the thresholds', () => {
    expect(apriBand(0.49)).toBe('low')
    expect(apriBand(0.5)).toBe('intermediate')
    expect(apriBand(2.01)).toBe('high')
  })
  test('pathway step follows the band', () => {
    expect(pathwayStepFor('low')).toBe('screen')
    expect(pathwayStepFor('intermediate')).toBe('confirm')
    expect(pathwayStepFor('high')).toBe('specialist')
  })
})

describe('fib4Drivers', () => {
  test('platelets falling raises FIB-4 and is named as the main driver', () => {
    const from = { sgot: 40, alt: 36, platelets: 240 }
    const to = { sgot: 40, alt: 36, platelets: 190 }
    const drivers = fib4Drivers(from, to, fib4(55, 40, 36, 240), fib4(55, 40, 36, 190))!
    const plt = drivers.find((d) => d.label === 'Platelets')!
    expect(plt.share).toBeCloseTo(26.3, 0)
    expect(drivers.find((d) => d.label === 'AST')!.share).toBeCloseTo(0, 5)
    expect(Math.abs(drivers.find((d) => d.label === 'Age and rounding')!.share)).toBeLessThan(1)
  })
  test('the shares multiply back to the total change', () => {
    const from = { sgot: 30, alt: 25, platelets: 250 }
    const to = { sgot: 55, alt: 40, platelets: 170 }
    const a = fib4(50, 30, 25, 250)
    const b = fib4(50, 55, 40, 170)
    const product = fib4Drivers(from, to, a, b)!.reduce((p, d) => p * (1 + d.share / 100), 1)
    expect(product).toBeCloseTo(b / a, 2)
  })
  test('returns null when a lab is missing', () => {
    expect(fib4Drivers({ sgot: null, alt: 1, platelets: 1 }, { sgot: 1, alt: 1, platelets: 1 }, 1, 1)).toBeNull()
  })
})
