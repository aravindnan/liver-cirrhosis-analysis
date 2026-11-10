import React from 'react'
import type { TrendPoint } from '../services/trendsServices'
import { fib4Drivers } from '../utils/scores'
import { formatDate } from '../utils/formatDate'

const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(0)}%`

// Explains the move in FIB-4 between the two newest reports in plain words.
function WhatChanged({ points }: { points: TrendPoint[] }) {
  const withFib = points.filter((p) => p.scores.fib4)
  if (withFib.length < 2) return null
  const prev = withFib[withFib.length - 2]
  const last = withFib[withFib.length - 1]
  const a = prev.scores.fib4!.value
  const b = last.scores.fib4!.value
  const drivers = fib4Drivers(prev.labs, last.labs, a, b)
  const direction = b > a ? 'rose' : b < a ? 'fell' : 'did not change'
  const ranked = drivers ? [...drivers].sort((x, y) => Math.abs(y.share) - Math.abs(x.share)) : []
  const main = ranked[0]

  return (
    <section aria-labelledby="changed-h" className="bg-C44 p-6 flex flex-col gap-3">
      <h2 id="changed-h" className="league-spartan font-bold text-[25px] text-gray-800">What changed</h2>
      <p className="text-[18px] max-w-[70ch]">
        Between {formatDate(prev.date)} and {formatDate(last.date)} your FIB-4 {direction}{b !== a ? ` from ${a} to ${b}` : ` at ${b}`}.
        {main && Math.abs(main.share) >= 1 && b !== a && ` The biggest reason was ${main.label.toLowerCase()}.`}
      </p>
      {drivers && b !== a && (
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {ranked.map((d) => (
            <li key={d.label} className="bg-white p-3">
              <div className="league-spartan font-bold text-[26px] text-C11">{pct(d.share)}</div>
              <div className="text-[14px]">{d.label}</div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] max-w-[70ch]">
        Each figure is how much FIB-4 would have moved if only that value had changed. Together they multiply to the full change. Age is not stored with a trend point, so it is grouped with rounding.
      </p>
    </section>
  )
}

export default WhatChanged
