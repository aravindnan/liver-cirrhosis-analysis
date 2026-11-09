import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrendsPage from './TrendsPage'
import { getTrends } from '../services/trendsServices'

jest.mock('../services/trendsServices', () => ({ getTrends: jest.fn() }))
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', fullName: 'Asha Menon' }, status: 'authenticated' }) }))
jest.mock('../modals/LogoutModal', () => () => null)
const mockedGetTrends = getTrends as jest.Mock

const thresholds = { fib4: { low: 1.3, lowFrom65: 2, high: 2.67 }, apri: { low: 0.5, high: 2 }, albi: { grade1: -2.6, grade2: -1.39 } }
const labs = { bilirubin: 1, albumin: 4, platelets: 200, sgot: 40, alt: null, alk_phos: 120 }
const point = (id: string, date: string, fib4: number | null) => ({
  reportId: id, date, labs: { ...labs, alt: fib4 ? 36 : null },
  scores: { fib4: fib4 ? { value: fib4, band: 'intermediate' as const } : null, apri: { value: 0.5, band: 'intermediate' as const }, albi: { value: -2.5, band: 'intermediate' as const } },
})

const renderPage = () => render(<MemoryRouter><TrendsPage /></MemoryRouter>)

beforeEach(() => mockedGetTrends.mockReset())

test('shows a loader, then charts for several reports', async () => {
  mockedGetTrends.mockResolvedValue({ thresholds, points: [point('a', '2026-01-01T00:00:00Z', 1.2), point('b', '2026-06-01T00:00:00Z', 1.8)] })
  renderPage()
  expect(await screen.findByRole('heading', { name: 'Guideline scores' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /FIB-4/ })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /APRI/ })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /Albumin/ })).toBeInTheDocument()
  expect(screen.getByText(/Results from 2 analysed reports/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'My trends' })).toBeInTheDocument()
})

test('with one report it says more reports are needed to see change', async () => {
  mockedGetTrends.mockResolvedValue({ thresholds, points: [point('a', '2026-01-01T00:00:00Z', 1.2)] })
  renderPage()
  expect(await screen.findByText(/one analysed report so far/)).toBeInTheDocument()
})

test('with no reports it explains how to get started', async () => {
  mockedGetTrends.mockResolvedValue({ thresholds, points: [] })
  renderPage()
  expect(await screen.findByText(/no analysed reports yet/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Analyse a report' })).toHaveAttribute('href', '/report-analysis')
})

test('a failed request shows a message instead of a blank page', async () => {
  mockedGetTrends.mockRejectedValue(new Error('network'))
  renderPage()
  expect(await screen.findByText(/could not load your trends/i)).toBeInTheDocument()
})

test('FIB-4 explains how to get it when ALT was never entered', async () => {
  mockedGetTrends.mockResolvedValue({ thresholds, points: [point('a', '2026-01-01T00:00:00Z', null), point('b', '2026-06-01T00:00:00Z', null)] })
  renderPage()
  expect(await screen.findByText(/Add your ALT \(SGPT\) result/)).toBeInTheDocument()
  expect(screen.queryByRole('img', { name: /FIB-4/ })).toBeNull()
})

test('lab charts say why there are no reference lines, and the page repeats the disclaimer', async () => {
  mockedGetTrends.mockResolvedValue({ thresholds, points: [point('a', '2026-01-01T00:00:00Z', 1.2)] })
  renderPage()
  expect(await screen.findByText(/normal ranges differ between labs/)).toBeInTheDocument()
  expect(within(screen.getByRole('note')).getByText(/not a medical diagnosis/i)).toBeInTheDocument()
})
