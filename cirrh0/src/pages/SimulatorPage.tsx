import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Page from '../components/Page'
import ScoreDial from '../components/ScoreDial'
import { albi, albiBand, albiGrade, apri, apriBand, doctorScript, fib4, fib4Band, PATHWAY, pathwayStepFor } from '../utils/scores'

type Field = { key: 'age' | 'ast' | 'alt' | 'platelets' | 'bilirubin' | 'albumin'; label: string; unit: string; min: number; max: number; step: number; note: string }

const FIELDS: Field[] = [
  { key: 'platelets', label: 'Platelets', unit: '10³/µL', min: 40, max: 450, step: 5, note: 'Lower platelets raise FIB-4 and APRI the most. Many causes besides the liver.' },
  { key: 'ast', label: 'AST', unit: 'U/L', min: 10, max: 300, step: 1, note: 'Can change with alcohol, weight, medicines and hard exercise.' },
  { key: 'alt', label: 'ALT', unit: 'U/L', min: 8, max: 300, step: 1, note: 'Often improves with weight loss and less alcohol in fatty liver.' },
  { key: 'age', label: 'Age', unit: 'years', min: 18, max: 90, step: 1, note: 'Cannot be changed, and it pushes FIB-4 up over time.' },
  { key: 'bilirubin', label: 'Bilirubin', unit: 'mg/dL', min: 0.2, max: 6, step: 0.1, note: 'Rises when the liver clears it poorly or bile cannot drain.' },
  { key: 'albumin', label: 'Albumin', unit: 'g/dL', min: 2, max: 5, step: 0.1, note: 'Falls when the liver makes less protein. Nutrition also matters.' },
]

const START = { age: 55, ast: 40, alt: 36, platelets: 200, bilirubin: 1.2, albumin: 3.8 }

function SimulatorPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [v, setV] = useState(START)

  const r = useMemo(() => {
    const f = fib4(v.age, v.ast, v.alt, v.platelets)
    const a = apri(v.ast, v.platelets)
    const b = albi(v.bilirubin, v.albumin)
    return { f, fb: fib4Band(f, v.age), a, ab: apriBand(a), b, bb: albiBand(b), grade: albiGrade(b) }
  }, [v])

  const step = pathwayStepFor(r.fb)

  return (
    <Page
      active="simulator"
      title="What moves my number?"
      intro="Drag a value and watch the three scores and the suggested next step change. The made-up starting values are the same as the demo report."
    >
      <section aria-labelledby="sim-in" className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 id="sim-in" className="league-spartan font-bold text-[26px] mb-4">Your values</h2>
          <div className="flex flex-col gap-6">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={`sim-${f.key}`} className="font-bold text-[17px]">{f.label} <span className="font-normal text-[15px]">({f.unit})</span></label>
                  <output htmlFor={`sim-${f.key}`} className="league-spartan font-bold text-[26px] text-C11">{v[f.key]}</output>
                </div>
                <input
                  id={`sim-${f.key}`} type="range" min={f.min} max={f.max} step={f.step} value={v[f.key]}
                  onChange={(e) => setV({ ...v, [f.key]: Number(e.target.value) })}
                  className="w-full h-[28px] accent-[#A90307]"
                  aria-describedby={`sim-${f.key}-note`}
                />
                <p id={`sim-${f.key}-note`} className="text-[14px]">{f.note}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setV(START)} className="mt-6 px-5 py-2 bg-C44 font-semibold text-[15px] hover:bg-C11 hover:text-white focus-visible:bg-C11 focus-visible:text-white rounded-[2px]">
            Reset to the demo values
          </button>
        </div>

        <div className="flex flex-col gap-4 md:sticky md:top-[100px] md:self-start">
          <h2 className="league-spartan font-bold text-[26px]">Your scores</h2>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <ScoreDial name="FIB-4" value={r.f} band={r.fb} note="Scarring screen" />
            <ScoreDial name="APRI" value={r.a} band={r.ab} note="Scarring estimate" />
            <ScoreDial name="ALBI" value={r.b} band={r.bb} note={`Grade ${r.grade}, liver function`} />
          </div>
          <p className="text-[14px]">APRI assumes an AST upper limit of normal of 40 U/L. Cut-offs are the same ones used on your result page.</p>
        </div>
      </section>

      <section aria-labelledby="path-h" className="bg-C11 text-white -mx-[4.3%] md:-mx-[12.5%] px-[4.3%] md:px-[12.5%] py-14 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 id="path-h" className="league-spartan font-bold text-[30px] md:text-[44px] leading-[1.1]">Where this puts you on the testing path</h2>
          <p className="text-[17px] max-w-[62ch]">Doctors usually test for liver scarring in steps, starting with a blood score. Your FIB-4 band decides how far along the next step is.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {PATHWAY.map((p) => {
            const here = p.id === step
            return (
              <li key={p.id} aria-current={here ? 'step' : undefined} className={`p-5 flex flex-col gap-2 ${here ? 'bg-white text-black' : 'bg-[#8c0306]'}`}>
                <h3 className="league-spartan font-bold text-[22px]">{p.title}</h3>
                <p className="text-[15px]">{p.body}</p>
                {here && <p className="font-bold text-C11 text-[15px]">Suggested next step for this FIB-4</p>}
              </li>
            )
          })}
        </ol>
        <div className="max-w-[62ch]">
          <p className="font-bold text-[17px]">A question to take to your doctor</p>
          <p className="text-[19px]">“{doctorScript(r.fb)}”</p>
        </div>
      </section>

      <p className="text-[15px]">
        Want these values from a real report? <Link to="/report-analysis" className="text-C11 font-semibold underline">Analyse a report</Link>, or read what each value means in <Link to="/learn" className="text-C11 font-semibold underline">the explainers</Link>.
      </p>
    </Page>
  )
}

export default SimulatorPage
