import React from 'react'
import { render, screen, within } from '@testing-library/react'
import LineChart, { changeSincePrevious, describeTrend, evenTicks, linearScale, paddedDomain } from './LineChart'

const pts = [
  { date: '2026-01-10T00:00:00Z', value: 1.2 },
  { date: '2026-06-10T00:00:00Z', value: 1.5 },
  { date: '2026-11-10T00:00:00Z', value: 1.83 },
]

describe('helpers', () => {
  test('linearScale maps the domain onto the range and survives a zero-width domain', () => {
    const s = linearScale(0, 10, 100, 200)
    expect([s(0), s(5), s(10)]).toEqual([100, 150, 200])
    expect(linearScale(3, 3, 0, 100)(3)).toBe(50)
  })

  test('paddedDomain adds room and handles a single value', () => {
    const [lo, hi] = paddedDomain(1, 2)
    expect(lo).toBeLessThan(1)
    expect(hi).toBeGreaterThan(2)
    const [a, b] = paddedDomain(5, 5)
    expect(a).toBeLessThan(5)
    expect(b).toBeGreaterThan(5)
    expect(paddedDomain(0, 0)[1]).toBeGreaterThan(0)
  })

  test('evenTicks spans the domain', () => {
    expect(evenTicks(0, 3, 4)).toEqual([0, 1, 2, 3])
  })

  test('changeSincePrevious compares the last two points', () => {
    expect(changeSincePrevious([pts[0]])).toBeNull()
    expect(changeSincePrevious(pts)).toEqual({ previous: 1.5, latest: 1.83, diff: 0.33 })
  })

  test('describeTrend gives a plain sentence for none, one and many results', () => {
    expect(describeTrend('FIB-4', [])).toMatch(/no results yet/)
    expect(describeTrend('FIB-4', [pts[0]])).toMatch(/one result, 1\.2/)
    expect(describeTrend('FIB-4', pts)).toMatch(/3 reports.*1\.2.*1\.83.*higher overall/)
    expect(describeTrend('FIB-4', [pts[2], pts[0]])).toMatch(/lower overall/)
    expect(describeTrend('X', [pts[0], { ...pts[0], date: '2026-02-01T00:00:00Z' }])).toMatch(/unchanged overall/)
  })
})

describe('LineChart', () => {
  test('renders nothing without data', () => {
    const { container } = render(<LineChart title="FIB-4" points={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('is exposed as an image with a title and a written description', () => {
    render(<LineChart title="FIB-4" points={pts} thresholds={[{ value: 1.3, label: '1.3 low' }]} />)
    const img = screen.getByRole('img', { name: /FIB-4/ })
    expect(img).toHaveAccessibleDescription(/3 reports.*higher overall/)
  })

  test('draws one point per result, a line between them, and the threshold label', () => {
    const { container } = render(<LineChart title="FIB-4" points={pts} thresholds={[{ value: 1.3, label: '1.3 low' }]} />)
    expect(container.querySelectorAll('circle')).toHaveLength(3)
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
    expect(screen.getByText('1.3 low')).toBeInTheDocument()
  })

  test('a single result shows a point but no line, and says it is the first report', () => {
    const { container } = render(<LineChart title="Albumin" unit="g/dL" points={[pts[0]]} />)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
    expect(screen.getByText(/first report/)).toBeInTheDocument()
  })

  test('shows the latest value and the change in words and symbols, not colour alone', () => {
    render(<LineChart title="FIB-4" points={pts} />)
    expect(screen.getByText(/Latest:/)).toHaveTextContent('1.83')
    expect(screen.getByText(/since the previous report/)).toHaveTextContent('▲ +0.33')
  })

  test('every chart offers its data as a table', () => {
    render(<LineChart title="Bilirubin" unit="mg/dL" points={pts} />)
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Bilirubin (mg/dL)' })).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(4) // header + 3 results
  })

  test('identical dates and values do not produce NaN coordinates', () => {
    const same = [{ date: '2026-01-01T00:00:00Z', value: 2 }, { date: '2026-01-01T00:00:00Z', value: 2 }]
    const { container } = render(<LineChart title="Flat" points={same} />)
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  })
})
