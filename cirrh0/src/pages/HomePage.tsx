import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthPage } from '../auth/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import APIResponseStatus from '../components/APIResponseStatus'
import Loader from '../assets/Loader'
import ScoreDial from '../components/ScoreDial'
import { fib4, fib4Band } from '../utils/scores'
import hero from '../assets/hero.jpg'
import heroLoop from '../assets/hero-loop.webp'
import cirr1 from '../assets/cirr1.jpg'
import norm4 from '../assets/norm4.jpg'

const TOOLS = [
  { to: '/report-analysis', name: 'Analyse a report', body: 'Upload a lab report, check the values, get scores, a stage estimate and a plain-language explanation.' },
  { to: '/simulator', name: 'What moves my number?', body: 'Drag platelets or AST and watch FIB-4 and the suggested next test change.' },
  { to: '/learn', name: 'What your numbers mean', body: 'Ten liver values explained: what they measure, why they rise or fall, what to read them with.' },
  { to: '/safety-check', name: 'Warning-sign check', body: 'Seven symptoms that need a doctor today, whatever the lab numbers say.' },
  { to: '/trends', name: 'My trends', body: 'Every report as a point on a chart, with a note on what changed since the last one.' },
]

// The one live thing on the page: the real FIB-4 formula on the demo report, with platelets in your hands.
function LiveFib4() {
  const [platelets, setPlatelets] = useState(200)
  const value = fib4(55, 40, 36, platelets)
  const band = fib4Band(value, 55)
  return (
    <div className="bg-white text-black p-6 md:p-8 flex flex-col gap-5">
      <div>
        <label htmlFor="home-plt" className="league-spartan font-bold text-[22px]">Platelets: <span className="text-C11">{platelets}</span> <span className="font-normal text-[16px]">(10³/µL)</span></label>
        <input id="home-plt" type="range" min={60} max={400} step={5} value={platelets} onChange={(e) => setPlatelets(Number(e.target.value))} className="w-full h-[30px] accent-[#A90307] mt-2" aria-describedby="home-plt-note" />
        <p id="home-plt-note" className="text-[14px]">Demo values: age 55, AST 40, ALT 36. Lower platelets push FIB-4 up.</p>
      </div>
      <ScoreDial name="FIB-4" value={value} band={band} note="Screen for liver scarring" />
      <Link to="/simulator" className="w-fit px-5 py-3 bg-C11 text-white font-semibold text-[15px] rounded-[2px]">Try all six values</Link>
    </div>
  )
}

function HomePage() {
  const { myProfiledata, pageLoading, networkError } = useAuthPage()
  useEffect(() => { window.scrollTo(0, 0) }, [])

  if (pageLoading === 'not-loaded') {
    return <div className="w-full min-h-screen flex justify-center items-center"><Loader /></div>
  }
  if (pageLoading !== 'loaded') {
    return (
      <div className="flex items-center justify-center flex-1 w-full min-h-screen">
        <APIResponseStatus status={false} message={networkError ? 'Network Error' : 'An Error Occured'} />
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-between min-h-screen">
      <Navbar activePage="start" />
      <main className="flex flex-col">
        {/* Hero: the title and the action on the left, the picture filling the right to the edge */}
        <section aria-labelledby="home-h" className="grid md:grid-cols-2 min-h-[100svh]">
          <div className="flex flex-col justify-center gap-6 px-[4%] md:pl-[10%] md:pr-[5%] pt-[110px] pb-12">
            <h1 id="home-h" className="league-spartan font-bold text-[40px] md:text-[40px] lg:text-[58px] leading-[1] tracking-[-0.03em] text-C11">Read your liver lab report</h1>
            <p className="text-[16px] md:text-[16px] max-w-[34ch]">Upload a report and get three standard scores, a stage estimate and plain-language notes to take to your doctor.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/report-analysis" className="px-6 py-3 bg-C11 text-white font-semibold text-[16px] rounded-[2px]">Analyse a report</Link>
              {!myProfiledata?.username && <Link to="/simulator" className="px-2 py-3 font-semibold text-[16px] text-C11 underline">or try the what-if tool</Link>}
            </div>
            <p className="text-[15px] max-w-[44ch]"><strong>Demo project.</strong> Use made-up values only. This is not medical advice.</p>
          </div>
          <picture>
            {/* People who ask their device for less motion get the still frame */}
            <source media="(prefers-reduced-motion: reduce)" srcSet={hero} />
            <img src={heroLoop} alt="Hands holding medical scan images" className="w-full h-[320px] md:h-full object-cover bg-black" />
          </picture>
        </section>

        {/* What it does */}
        <section aria-labelledby="what-h" className="mx-auto w-[92%] md:w-[80%] py-24 md:py-40 grid gap-10 md:grid-cols-2 md:gap-20 items-center">
          <div className="flex flex-col gap-5">
            <h2 id="what-h" className="league-spartan font-bold text-[30px] md:text-[42px] leading-[1.05]">One report becomes three scores</h2>
            <p className="text-[16px]">FIB-4 and APRI screen for liver scarring from age, AST, ALT and platelets. ALBI describes how well the liver is working, from bilirubin and albumin. They are plain formulas with published cut-offs, so the same values always give the same answer.</p>
            <p className="text-[16px]">Beside them sits a research model&rsquo;s stage estimate, with its measured accuracy printed next to it: about half right on patients it had not seen.</p>
            <Link to="/about" className="w-fit font-semibold text-C11 underline text-[16px]">How it works and what it collects</Link>
          </div>
          <img src={cirr1} alt="A liver with advanced scarring" className="w-full h-[360px] md:h-[520px] object-cover" />
        </section>

        {/* The live thing, on a whole field of colour */}
        <section aria-labelledby="live-h" className="bg-C11 text-white">
          <div className="mx-auto w-[92%] md:w-[80%] py-20 md:py-32 grid gap-10 md:grid-cols-2 md:gap-20 items-center">
            <div className="flex flex-col gap-5">
              <h2 id="live-h" className="league-spartan font-bold text-[30px] md:text-[42px] leading-[1.05]">Move one number, watch the score</h2>
              <p className="text-[16px] max-w-[48ch]">Platelets are the value that moves FIB-4 the most. Drag it and see the score and its band change. Everything else on this page works the same way.</p>
            </div>
            <LiveFib4 />
          </div>
        </section>

        {/* Tools: flat rows, each a real link */}
        <section aria-labelledby="tools-h" className="mx-auto w-[92%] md:w-[80%] py-24 md:py-40 flex flex-col gap-8">
          <h2 id="tools-h" className="league-spartan font-bold text-[30px] md:text-[42px] leading-[1.05]">What you can do here</h2>
          <ul className="flex flex-col gap-3">
            {TOOLS.map((t) => (
              <li key={t.to}>
                <Link to={t.to} className="grid gap-1 md:grid-cols-[1fr_2fr] md:gap-10 bg-C44 p-6 md:p-8 hover:bg-C11 hover:text-white focus-visible:bg-C11 focus-visible:text-white">
                  <span className="league-spartan font-bold text-[24px] md:text-[26px]">{t.name}</span>
                  <span className="text-[16px]">{t.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Why it exists */}
        <section aria-labelledby="why-h" className="mx-auto w-[92%] md:w-[80%] pb-24 md:pb-40 grid gap-10 md:grid-cols-2 md:gap-20 items-center">
          <img src={norm4} alt="A healthy liver" className="w-full h-[360px] md:h-[480px] object-cover md:order-1" />
          <div className="flex flex-col gap-5">
            <h2 id="why-h" className="league-spartan font-bold text-[30px] md:text-[42px] leading-[1.05]">Why check the liver at all</h2>
            <p className="text-[16px]">Liver scarring (cirrhosis) usually causes no symptoms until it is advanced, and it is caused by things that can be changed: alcohol, fatty liver and hepatitis infections.</p>
            <p className="text-[16px]">A blood test is how most scarring is first noticed. Cirrh0 helps you read that test and know which question to ask next. It is a student demo, not a doctor.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default HomePage
