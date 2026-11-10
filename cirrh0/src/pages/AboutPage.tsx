import React, { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'

// What each part of the app stores or sends, written from the code (schema.prisma, app.py, the web services).
const STEPS = [
  { title: 'You upload a lab report', body: 'The PDF goes from your browser straight to Cloudinary, a file-hosting service. The app then asks the model service to read its text.' },
  { title: 'The values are read, and you check them', body: 'A parser pulls out the numbers it recognises. You see every value and can correct anything it got wrong before anything is analysed.' },
  { title: 'Three guideline scores are calculated', body: 'FIB-4, APRI and ALBI are plain formulas on your values, with published cut-offs. No machine learning is involved, so the same values always give the same scores.' },
  { title: 'A model gives a stage estimate', body: 'A CatBoost model estimates a stage from 1 to 4. It was trained on a 1970s–80s study of one liver disease, and on patients it had not seen it was right about half the time. The result page says so.' },
  { title: 'An AI writes the explanation', body: 'Google’s Gemini is given only the stage number and asked for general lifestyle and doctor-type notes. It is never sent your name, your lab values or your files.' },
  { title: 'Everything is saved to your account', body: 'You can open it again, see how your numbers change over time, or delete a report from your profile.' },
]

const COLLECTED = [
  { what: 'Your account', detail: 'Username, email address, full name, age and gender. Your password is stored only as a bcrypt hash, never as text. The time of your last login is also kept.' },
  { what: 'Each lab report you analyse', detail: 'The values read from the report (bilirubin, albumin, platelets, AST, ALT and others), your four yes/no symptom answers, the date, and the PDF files themselves.' },
  { what: 'What the app works out', detail: 'The three scores with their bands, the model’s stage estimate and the written explanation. Scores are saved so an old report never changes if a formula is updated later.' },
  { what: 'Slide images', detail: 'If you use the slide-image tool: the image file, the age and sex you enter, and the findings the image model reports.' },
  { what: 'A login cookie', detail: 'One cookie that keeps you signed in for two hours. Scripts on the page cannot read it. No analytics and no advertising trackers are used.' },
]

const SHARED = [
  { who: 'Cloudinary', what: 'stores the files you upload. Anyone who has a file’s link can open it, which is the main reason this is a demo that asks for made-up data.' },
  { who: 'Google Gemini', what: 'receives the stage number (or the detected slide features) to write general text.' },
  { who: 'Roboflow', what: 'analyses a slide image if you use the slide-image tool.' },
  { who: 'Render', what: 'hosts the website, the API and the database.' },
]

const link = 'font-semibold underline underline-offset-4'

function AboutPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="flex flex-col justify-between min-h-screen bg-[#EAF2FB]">
      <Navbar activePage="about" />
      <main className="flex-1">
        {/* Opening: a whole field of the brand red */}
        <header className="bg-C11 text-white pt-[110px] md:pt-[150px] pb-16 md:pb-24">
          <div className="mx-auto w-[92%] md:w-[80%] flex flex-col gap-4">
            <h1 className="league-spartan font-bold text-[34px] md:text-[54px] leading-[1.05]">How Cirrh0 works</h1>
            <p className="text-[16px] md:text-[18px] max-w-[60ch]">
              Cirrh0 reads a liver lab report, works out three standard scores, and explains them in plain words. This page follows a report from upload to saved result, and says what is kept along the way.
            </p>
            <p className="text-[15px] max-w-[60ch]">
              Built by <strong>Aravind Nandakumar</strong> as a demo project. Not a medical device, and it does not give a diagnosis.
            </p>
          </div>
        </header>

        {/* The flow: one thick track runs down the page and the steps hang off it */}
        <section aria-labelledby="steps-h" className="mx-auto w-[92%] md:w-[80%] py-16 md:py-24">
          <h2 id="steps-h" className="league-spartan font-bold text-[28px] md:text-[38px] leading-[1.1] mb-12">What happens to a report</h2>
          <ol className="relative flex flex-col gap-12 md:gap-16 before:content-[''] before:absolute before:top-2 before:bottom-2 before:left-[13px] md:before:left-1/2 md:before:-ml-[4px] before:w-[8px] before:bg-C11">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative pl-12 md:pl-0 md:grid md:grid-cols-2 md:gap-24">
                <span aria-hidden="true" className="absolute left-0 md:left-1/2 md:-ml-[16px] top-1 h-[34px] w-[34px] rounded-full bg-white border-[8px] border-C11" />
                <div className={i % 2 === 0 ? 'md:col-start-1 md:text-right' : 'md:col-start-2'}>
                  <h3 className="league-spartan font-bold text-[20px] md:text-[24px] leading-[1.15] text-C11">{s.title}</h3>
                  <p className="text-[15px] md:text-[16px] mt-1">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What is collected: the flow arrives at the data, on a dark field */}
        <section aria-labelledby="data-h" className="bg-[#1b1b1f] text-white">
          <div className="mx-auto w-[92%] md:w-[80%] py-16 md:py-24 grid gap-10 md:grid-cols-[1fr_2fr] md:gap-20">
            <div>
              <h2 id="data-h" className="league-spartan font-bold text-[28px] md:text-[38px] leading-[1.1]">What information it collects</h2>
              <p className="text-[15px] mt-4 text-[#d9d9de]">The server logs record requests and errors, but never passwords, emails, tokens or lab values.</p>
            </div>
            <dl className="flex flex-col gap-7">
              {COLLECTED.map((c) => (
                <div key={c.what} className="pl-5 border-l-[6px] border-C11">
                  <dt className="league-spartan font-bold text-[19px]">{c.what}</dt>
                  <dd className="text-[15px] md:text-[16px] text-[#e7e7ea]">{c.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Who else handles it: a plain list, not boxes */}
        <section aria-labelledby="share-h" className="mx-auto w-[92%] md:w-[80%] py-16 md:py-24">
          <h2 id="share-h" className="league-spartan font-bold text-[28px] md:text-[38px] leading-[1.1] mb-8">Who else handles it</h2>
          <ul className="flex flex-col gap-4 text-[16px] md:text-[17px] max-w-[70ch]">
            {SHARED.map((s) => (
              <li key={s.who}><strong className="text-C11 league-spartan text-[19px]">{s.who}</strong> {s.what}</li>
            ))}
          </ul>
        </section>

        {/* Close: back to the red, with the next step */}
        <section aria-labelledby="try-h" className="bg-C11 text-white">
          <div className="mx-auto w-[92%] md:w-[80%] py-14 md:py-20 flex flex-col gap-5">
            <h2 id="try-h" className="league-spartan font-bold text-[28px] md:text-[38px] leading-[1.1]">What you can do</h2>
            <ul className="flex flex-col gap-2 text-[16px] md:text-[17px]">
              <li><Link to="/report-analysis" className={link}>Analyse a report</Link>: values, scores, stage estimate and explanation.</li>
              <li><Link to="/simulator" className={link}>Try the what-if tool</Link>: drag a value and watch the scores move.</li>
              <li><Link to="/learn" className={link}>Read what each value means</Link>.</li>
              <li><Link to="/safety-check" className={link}>Check for warning signs</Link> that need a doctor today.</li>
              <li><Link to="/trends" className={link}>See your trends</Link> once you have analysed a report.</li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default AboutPage
