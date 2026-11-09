import React from 'react'

export type Score = {
  id: string
  name: string
  value: number | null
  band: 'low' | 'intermediate' | 'high' | null
  unavailableReason?: string
  purpose?: string
  bandLabel?: string
  meaning?: string
  formula?: string
  cutoffs?: string
  inputs?: Record<string, number>
  caveats?: string[]
  source?: string
}

// The band is always written out as well as coloured, so it never depends on colour alone.
const BAND_STYLE: Record<string, { chip: string; mark: string }> = {
  low: { chip: 'bg-[#e5f2e8] text-[#1f5a2f] border-[#2e6b3f]', mark: '●' },
  intermediate: { chip: 'bg-[#fdf1dc] text-[#7a4700] border-[#9a5b00]', mark: '◆' },
  high: { chip: 'bg-[#fbe9e7] text-[#8c1c15] border-[#b3261e]', mark: '▲' },
}

function ScoreCard({ score }: { score: Score }) {
  if (score.value === null || score.band === null) {
    return (
      <div className="border border-gray-200 bg-gray-50 p-4 rounded-[4px] flex flex-col gap-1" data-testid={`score-${score.id}`}>
        <div className="league-spartan font-bold text-[20px] text-gray-700">{score.name}</div>
        <div className="text-[13px] text-gray-600">Not calculated</div>
        <div className="text-[13px]">{score.unavailableReason}</div>
      </div>
    )
  }
  const style = BAND_STYLE[score.band]
  return (
    <div className="border border-gray-200 bg-white p-4 rounded-[4px] flex flex-col gap-2" data-testid={`score-${score.id}`}>
      <div>
        <div className="league-spartan font-bold text-[20px] text-gray-800">{score.name}</div>
        <div className="text-[12px] text-gray-600">{score.purpose}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="league-spartan font-semibold text-[40px] leading-none text-C11" aria-label={`${score.name} score`}>
          {score.value}
        </div>
        <span className={`inline-flex items-center gap-1 border px-2 py-1 text-[12px] font-bold ${style.chip}`}>
          <span aria-hidden="true">{style.mark}</span>
          {score.bandLabel}
        </span>
      </div>
      <p className="text-[14px]">{score.meaning}</p>
      <details className="text-[13px]">
        <summary className="cursor-pointer font-semibold text-C11">How this is calculated</summary>
        <div className="mt-2 flex flex-col gap-2">
          <p><strong>Formula:</strong> {score.formula}</p>
          <p><strong>Cut-offs:</strong> {score.cutoffs}</p>
          {score.inputs && (
            <div>
              <strong>Your values used:</strong>
              <ul className="list-disc pl-5">
                {Object.entries(score.inputs).map(([label, value]) => (
                  <li key={label}>{label}: {value}</li>
                ))}
              </ul>
            </div>
          )}
          {score.caveats && score.caveats.length > 0 && (
            <div>
              <strong>Good to know:</strong>
              <ul className="list-disc pl-5">
                {score.caveats.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}
          {score.source && <p className="text-gray-600"><strong>Source:</strong> {score.source}</p>}
        </div>
      </details>
    </div>
  )
}

function ScoresPanel({ scores }: { scores?: Score[] | null }) {
  if (!scores || scores.length === 0) return null
  return (
    <section aria-labelledby="scores-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="scores-heading" className="league-spartan font-bold text-[25px] text-gray-800">Guideline scores</h2>
        <p className="text-[13px] text-gray-600 max-w-[70ch]">
          Standard formulas that doctors use, worked out from your own values. They do not use machine
          learning, so the same values always give the same result. They help start a conversation with
          your doctor and are not a diagnosis.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {scores.map((s) => <ScoreCard key={s.id} score={s} />)}
      </div>
    </section>
  )
}

export default ScoresPanel
