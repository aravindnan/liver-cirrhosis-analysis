import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Loader from '../assets/Loader'
import Disclaimer from '../components/Disclaimer'
import LineChart, { ChartPoint, Threshold } from '../components/LineChart'
import APIResponseStatus from '../components/APIResponseStatus'
import { getTrends, Trends } from '../services/trendsServices'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; trends: Trends }

const LABS: { key: keyof Trends['points'][number]['labs']; title: string; unit: string }[] = [
  { key: 'bilirubin', title: 'Bilirubin', unit: 'mg/dL' },
  { key: 'albumin', title: 'Albumin', unit: 'g/dL' },
  { key: 'platelets', title: 'Platelets', unit: '10³/µL' },
  { key: 'sgot', title: 'AST (SGOT)', unit: 'U/L' },
  { key: 'alt', title: 'ALT (SGPT)', unit: 'U/L' },
  { key: 'alk_phos', title: 'Alkaline phosphatase', unit: 'U/L' },
]

function TrendsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    window.scrollTo(0, 0)
    let cancelled = false
    getTrends()
      .then((trends) => { if (!cancelled) setState({ status: 'ready', trends }) })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [])

  let body: React.ReactNode
  if (state.status === 'loading') {
    body = <div className="flex justify-center py-20"><Loader /></div>
  } else if (state.status === 'error') {
    body = <div className="py-10"><APIResponseStatus status={false} message="We could not load your trends. Please try again." /></div>
  } else {
    const { points, thresholds } = state.trends
    if (points.length === 0) {
      body = (
        <div className="py-10 flex flex-col items-start gap-3 max-w-[60ch]">
          <p>You have no analysed reports yet. Once you analyse a report, your scores and lab values appear here, and each new report adds a point.</p>
          <Link to="/report-analysis" className="shadow-md px-5 py-2 bg-C11 text-white text-[14px] font-semibold rounded-[2px]">Analyse a report</Link>
        </div>
      )
    } else {
      const scoreSeries = (id: 'fib4' | 'apri' | 'albi'): ChartPoint[] =>
        points.flatMap((p) => (p.scores[id] ? [{ date: p.date, value: p.scores[id]!.value }] : []))
      const labSeries = (key: keyof Trends['points'][number]['labs']): ChartPoint[] =>
        points.flatMap((p) => (p.labs[key] !== null ? [{ date: p.date, value: p.labs[key] as number }] : []))

      const scores: { id: 'fib4' | 'apri' | 'albi'; title: string; lines: Threshold[] }[] = [
        { id: 'fib4', title: 'FIB-4', lines: [{ value: thresholds.fib4.low, label: `${thresholds.fib4.low} low risk below` }, { value: thresholds.fib4.high, label: `${thresholds.fib4.high} high risk above` }] },
        { id: 'apri', title: 'APRI', lines: [{ value: thresholds.apri.low, label: `${thresholds.apri.low} threshold` }, { value: thresholds.apri.high, label: `${thresholds.apri.high.toFixed(1)} high` }] },
        { id: 'albi', title: 'ALBI', lines: [{ value: thresholds.albi.grade1, label: `${thresholds.albi.grade1} grade 1 at or below` }, { value: thresholds.albi.grade2, label: `${thresholds.albi.grade2} grade 3 above` }] },
      ]

      body = (
        <>
          <p className="text-[14px] text-gray-700 max-w-[70ch]">
            {points.length === 1
              ? 'You have one analysed report so far. Add another to see how your results change over time.'
              : `Results from ${points.length} analysed reports, oldest to newest. Hover or focus a point to see its value, or open "Show as table".`}
          </p>

          <section aria-labelledby="trend-scores" className="flex flex-col gap-3">
            <h2 id="trend-scores" className="league-spartan font-bold text-[25px] text-gray-800">Guideline scores</h2>
            <p className="text-[13px] text-gray-600 max-w-[70ch]">Dashed lines are the published cut-offs used for each score. They are not a diagnosis; see your result page for what each score means.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {scores.map((s) => {
                const series = scoreSeries(s.id)
                return series.length > 0 ? <LineChart key={s.id} title={s.title} points={series} thresholds={s.lines} /> : (
                  <div key={s.id} className="border border-gray-200 bg-gray-50 p-4 rounded-[4px] text-[13px]">
                    <div className="league-spartan font-bold text-[20px] text-gray-700">{s.title}</div>
                    {s.id === 'fib4' ? 'Add your ALT (SGPT) result when you analyse a report to see FIB-4 here.' : 'Not enough data.'}
                  </div>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="trend-labs" className="flex flex-col gap-3">
            <h2 id="trend-labs" className="league-spartan font-bold text-[25px] text-gray-800">Lab values</h2>
            <p className="text-[13px] text-gray-600 max-w-[70ch]">There are no reference lines here because normal ranges differ between labs. Check the range printed on your own report.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {LABS.map((l) => <LineChart key={l.key} title={l.title} unit={l.unit} points={labSeries(l.key)} />)}
            </div>
          </section>
        </>
      )
    }
  }

  return (
    <div className="flex flex-col justify-between min-h-screen">
      <Navbar activePage="trends" />
      <main className="flex-1 pt-[100px] md:pt-[120px] px-4 md:px-[120px] flex flex-col gap-6">
        <h1 className="league-spartan font-bold text-[32px] md:text-[50px] text-C11">My trends</h1>
        <Disclaimer />
        {body}
      </main>
      <Footer />
    </div>
  )
}

export default TrendsPage
