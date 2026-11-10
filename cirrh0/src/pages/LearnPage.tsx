import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Page from '../components/Page'
import { BIOMARKERS } from '../utils/biomarkers'

function LearnPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <Page
      active="learn"
      title="What your liver numbers mean"
      intro="Every value Cirrh0 reads from a report, in plain language: what it measures, why it goes up or down, and which other values to read it with."
    >
      <nav aria-label="Values" className="flex flex-wrap gap-2">
        {BIOMARKERS.map((b) => (
          <a key={b.id} href={`#${b.id}`} className="px-3 py-2 bg-C44 text-[14px] font-semibold hover:bg-C11 hover:text-white focus-visible:bg-C11 focus-visible:text-white rounded-[2px]">
            {b.name}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-16">
        {BIOMARKERS.map((b) => (
          <section key={b.id} id={b.id} aria-labelledby={`${b.id}-h`} className="grid gap-4 md:grid-cols-[1fr_2fr] md:gap-12 scroll-mt-[100px]">
            <div>
              <h2 id={`${b.id}-h`} className="league-spartan font-bold text-[28px] md:text-[36px] leading-[1.1]">{b.name}</h2>
              <p className="text-[15px] mt-1">Reported in {b.unit}</p>
              <p className="text-[15px] mt-3 bg-C44 px-3 py-2 inline-block">Used in: {b.usedIn}</p>
            </div>
            <dl className="flex flex-col gap-4 text-[17px]">
              <div><dt className="font-bold">What it measures</dt><dd>{b.measures}</dd></div>
              <div><dt className="font-bold">When it is high</dt><dd>{b.high}</dd></div>
              <div><dt className="font-bold">When it is low</dt><dd>{b.low}</dd></div>
              <div><dt className="font-bold">Read it with</dt><dd>{b.withOthers}</dd></div>
            </dl>
          </section>
        ))}
      </div>
      <p className="text-[15px]">
        Normal ranges differ between labs, so check the range printed on your own report. To see how a change in one value moves your scores, try the <Link to="/simulator" className="text-C11 font-semibold underline">what-if tool</Link>.
      </p>
    </Page>
  )
}

export default LearnPage
