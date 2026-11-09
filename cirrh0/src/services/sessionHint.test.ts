import { SESSION_MS, clearSessionHint, readSessionHint, writeSessionHint } from './sessionHint'

beforeEach(() => localStorage.clear())

test('returns null when there is no hint', () => {
  expect(readSessionHint()).toBeNull()
})

test('a fresh hint is readable and carries only the user id and expiry', () => {
  writeSessionHint('user-1', 1_000)
  expect(readSessionHint(1_001)).toEqual({ _id: 'user-1', exp: 1_000 + SESSION_MS })
})

test('an expired hint is dropped', () => {
  writeSessionHint('user-1', 1_000)
  expect(readSessionHint(1_000 + SESSION_MS)).toBeNull()
  expect(localStorage.length).toBe(0)
})

test('malformed storage is treated as logged out', () => {
  localStorage.setItem('cirrh0_session_hint', '{not json')
  expect(readSessionHint()).toBeNull()
  localStorage.setItem('cirrh0_session_hint', JSON.stringify({ _id: 5, exp: 'x' }))
  expect(readSessionHint()).toBeNull()
})

test('clearSessionHint logs the user out locally', () => {
  writeSessionHint('user-1')
  clearSessionHint()
  expect(readSessionHint()).toBeNull()
})
