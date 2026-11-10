import React from 'react'
import type { Band } from '../utils/scores'

// The band is always written out as well as coloured, so it never depends on colour alone.
export const BAND_TEXT: Record<Band, string> = { low: 'Low', intermediate: 'Middle', high: 'High' }
const BAND_BG: Record<Band, string> = { low: 'bg-[#e5f2e8] text-[#1f5a2f]', intermediate: 'bg-[#fdf1dc] text-[#7a4700]', high: 'bg-[#fbe9e7] text-[#8c1c15]' }

type Props = { name: string; value: number; band: Band; note: string }

function ScoreDial({ name, value, band, note }: Props) {
  return (
    <div className={`p-5 flex flex-col gap-1 ${BAND_BG[band]}`} data-testid={`dial-${name}`}>
      <div className="league-spartan font-bold text-[20px]">{name}</div>
      <div className="league-spartan font-bold text-[56px] leading-none" aria-live="polite">{value}</div>
      <div className="font-bold text-[15px]">{BAND_TEXT[band]} band</div>
      <p className="text-[14px]">{note}</p>
    </div>
  )
}

export default ScoreDial
