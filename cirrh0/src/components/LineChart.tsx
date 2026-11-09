import React, { useId } from 'react'
import { formatDate } from '../utils/formatDate'

export type ChartPoint = { date: string; value: number }
export type Threshold = { value: number; label: string }

export const linearScale = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)

export const paddedDomain = (min: number, max: number): [number, number] => {
  const span = max - min || Math.abs(max) || 1
  const pad = span * 0.15
  return [min - pad, max + pad]
}

export const evenTicks = (d0: number, d1: number, count = 4): number[] =>
  Array.from({ length: count }, (_, i) => d0 + ((d1 - d0) * i) / (count - 1))

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)))

// Change between the two most recent points, or null when there is only one.
export const changeSincePrevious = (points: ChartPoint[], digits = 2) => {
  if (points.length < 2) return null
  const previous = points[points.length - 2].value
  const latest = points[points.length - 1].value
  const diff = Number((latest - previous).toFixed(digits))
  return { previous, latest, diff }
}

// A sentence a screen reader can use in place of the picture.
export const describeTrend = (name: string, points: ChartPoint[], digits = 2): string => {
  if (points.length === 0) return `${name}: no results yet.`
  const first = points[0]
  const last = points[points.length - 1]
  if (points.length === 1) return `${name}: one result, ${trim(first.value, digits)} on ${formatDate(first.date)}.`
  const diff = Number((last.value - first.value).toFixed(digits))
  const direction = diff > 0 ? 'higher' : diff < 0 ? 'lower' : 'unchanged'
  return `${name} across ${points.length} reports: ${trim(first.value, digits)} on ${formatDate(first.date)}, then ${trim(last.value, digits)} on ${formatDate(last.date)} (${direction} overall).`
}

type LineChartProps = {
  title: string
  unit?: string
  points: ChartPoint[]
  thresholds?: Threshold[]
  digits?: number
}

// Drawn on a narrow canvas so text stays readable when the chart is scaled to a phone screen
// (at 309 px wide, 13 units of type is about 9.5 px).
const W = 420
const H = 240
const M = { left: 46, right: 10, top: 16, bottom: 34 }

function LineChart({ title, unit = '', points, thresholds = [], digits = 2 }: LineChartProps) {
  const uid = useId()
  if (points.length === 0) return null

  const times = points.map((p) => new Date(p.date).getTime())
  const values = points.map((p) => p.value)
  const [d0, d1] = paddedDomain(Math.min(...values, ...thresholds.map((t) => t.value)), Math.max(...values, ...thresholds.map((t) => t.value)))
  const x = linearScale(Math.min(...times), Math.max(...times), M.left + 8, W - M.right - 8)
  const y = linearScale(d0, d1, H - M.bottom, M.top)
  const description = describeTrend(title, points, digits)
  const change = changeSincePrevious(points, digits)
  const last = points[points.length - 1]

  return (
    <figure className="border border-gray-200 bg-white p-4 rounded-[4px] flex flex-col gap-2 min-w-0">
      <figcaption>
        <div className="league-spartan font-bold text-[20px] text-gray-800">{title}</div>
        <div className="text-[13px] text-gray-700">
          Latest: <strong>{trim(last.value, digits)}{unit ? ` ${unit}` : ''}</strong>
          {change && (
            <span>
              {' '}({change.diff > 0 ? '▲ +' : change.diff < 0 ? '▼ ' : '= '}
              {trim(change.diff, digits)} since the previous report)
            </span>
          )}
          {!change && <span> (first report)</span>}
        </div>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}-t`} aria-describedby={`${uid}-d`} className="w-full h-auto text-gray-500">
        <title id={`${uid}-t`}>{title}</title>
        <desc id={`${uid}-d`}>{description}</desc>

        {evenTicks(d0, d1).map((tick) => (
          <g key={tick}>
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} stroke="currentColor" strokeOpacity={0.2} />
            <text x={M.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={13} fill="currentColor">{trim(tick, digits)}</text>
          </g>
        ))}

        {thresholds.map((t) => (
          <line
            key={`line-${t.label}-${t.value}`} className="text-C11"
            x1={M.left} x2={W - M.right} y1={y(t.value)} y2={y(t.value)}
            stroke="currentColor" strokeWidth={1.25} strokeDasharray="6 4"
          />
        ))}

        <g className="text-C11">
          {points.length > 1 && (
            <polyline
              fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
              points={points.map((p, i) => `${x(times[i])},${y(p.value)}`).join(' ')}
            />
          )}
          {points.map((p, i) => (
            <circle key={`${p.date}-${i}`} cx={x(times[i])} cy={y(p.value)} r={4.5} fill="currentColor" stroke="white" strokeWidth={1.5}>
              <title>{`${formatDate(p.date)}: ${trim(p.value, digits)}${unit ? ` ${unit}` : ''}`}</title>
            </circle>
          ))}
        </g>

        {/* Labels are drawn last so the data line and points never hide them */}
        {thresholds.map((t) => (
          <text
            key={`label-${t.label}-${t.value}`} className="text-C11"
            x={W - M.right - 2} y={y(t.value) - 5} textAnchor="end" fontSize={13} fill="currentColor"
            stroke="white" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round"
          >{t.label}</text>
        ))}

        <text x={x(times[0])} y={H - 8} textAnchor={points.length > 1 ? 'start' : 'middle'} fontSize={13} fill="currentColor">{formatDate(points[0].date)}</text>
        {points.length > 1 && (
          <text x={x(times[times.length - 1])} y={H - 8} textAnchor="end" fontSize={13} fill="currentColor">{formatDate(last.date)}</text>
        )}
      </svg>

      <details className="text-[13px]">
        <summary className="cursor-pointer font-semibold text-C11">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr><th scope="col" className="pr-4 font-semibold">Date</th><th scope="col" className="font-semibold">{title}{unit ? ` (${unit})` : ''}</th></tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={`${p.date}-${i}`}><td className="pr-4">{formatDate(p.date)}</td><td>{trim(p.value, digits)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default LineChart
