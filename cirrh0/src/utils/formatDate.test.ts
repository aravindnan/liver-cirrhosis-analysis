import { formatDateTime } from './formatDate'

test('formats a valid date with year, month and time', () => {
  const out = formatDateTime('2026-11-10T15:45:00Z')
  expect(out).toMatch(/2026/)
  expect(out).toMatch(/\d{1,2}:\d{2}/)
})

test('returns an empty string for missing or invalid dates instead of throwing', () => {
  expect(formatDateTime(undefined)).toBe('')
  expect(formatDateTime(null)).toBe('')
  expect(formatDateTime('')).toBe('')
  expect(formatDateTime('not a date')).toBe('')
})
