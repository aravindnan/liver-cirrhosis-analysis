import React, { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'

// What each part of the app stores or sends, written from the code (schema.prisma, app.py, the web services).
const COLLECTED = [
  { what: 'Your account', detail: 'Username, email address, full name, age and gender. Your password is stored only as a bcrypt hash, never as text. The time of your last login is also kept.' },
  { what: 'Each lab report you analyse', detail: 'The values read from the report (bilirubin, albumin, platelets, AST, ALT and others), your four yes/no symptom answers, the date, and the PDF files themselves.' },
  { what: 'What the app works out', detail: 'The three guideline scores with their bands, the model’s stage estimate, and the written explanation. Scores are saved so an old report never changes if a formula is updated later.' },
  { what: 'Slide images', detail: 'If you use the slide-image tool: the image file, the age and sex you enter, and the findings the image model reports.' },
  { what: 'A login cookie', detail: 'One cookie that keeps you signed in for two hours. It cannot be read by scripts on the page. No analytics and no advertising trackers are used.' },
]

const STEPS = [
  { title: 'You upload a lab report', body: 'The PDF goes from your browser straight to Cloudinary, a file-hosting service. The app then asks the model service to read the text.' },
  { title: 'The values are read, and you check them', body: 'A parser pulls out the numbers it recognises. You see every value and can correct anything it got wrong before anything is analysed.' },
  { title: 'Three guideline scores are calculated', body: 'FIB-4, APRI and ALBI are plain formulas on your values, with published cut-offs. No machine learning is involved, so the same values always give the same scores.' },
  { title: 'A model gives a stage estimate', body: 'A CatBoost model estimates a stage from 1 to 4. It was trained on a 1970s–80s study of one liver disease, and on patients it had not seen it was right about half the time. The result page says so.' },
  { title: 'An AI writes the explanation', body: 'Google’s Gemini is given only the stage number and asks for general lifestyle and doctor-type notes. It is never sent your name, your lab values or your files.' },
  { title: 'Everything is saved to your account', body: 'You can open it again, see how your numbers change over time, or delete a report from your profile.' },
]

const SHARED = [
  { who: 'Cloudinary', what: 'Stores the files you upload. Anyone who has a file’s link can open it. This is the main reason the app is a demo and asks for made-up data only.' },
  { who: 'Google Gemini', what: 'Receives the stage number (or the detected slide features) to write general text.' },
  { who: 'Roboflow', what: 'Analyses a slide image when you use the slide-image tool.' },
  { who: 'Render', what: 'Hosts the website, the API and the database.' },
]

function AboutPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="flex flex-col justify-between min-h-screen">
      <Navbar activePage="about" />
      <main className="flex-1 pt-[100px] md:pt-[130px] mx-auto w-[92%] md:w-[80%] flex flex-col gap-20 md:gap-28">
        <header className="flex flex-col gap-4">
          <h1 className="league-spartan font-bold text-[36px] md:text-[64px] leading-[1.05] text-C11">How Cirrh0 works</h1>
          <p className="text-[18px] md:text-[21px] max-w-[62ch]">
            Cirrh0 reads a liver lab report, works out three standard scores, and explains them in plain words. This page says what it does with your information, step by step.
          </p>
          <p className="text-[16px] max-w-[62ch]">
            Built by <strong className="text-C11">Aravind Nandakumar</strong> as a demo project. It is not a medical device and does not give a diagnosis.
          </p>
        </header>

        <section aria-labelledby="steps-h" className="flex flex-col gap-8">
          <h2 id="steps-h" className="league-spartan font-bold text-[30px] md:text-[44px] leading-[1.1]">What happens to a report</h2>
          <ol className="grid gap-4 md:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.title} className="bg-C44 p-6 flex flex-col gap-2">
                <h3 className="league-spartan font-bold text-[22px]">{s.title}</h3>
                <p className="text-[17px]">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="data-h" className="bg-C11 text-white -mx-[4.3%] md:-mx-[12.5%] px-[4.3%] md:px-[12.5%] py-16 flex flex-col gap-8">
          <h2 id="data-h" className="league-spartan font-bold text-[30px] md:text-[44px] leading-[1.1]">What information it collects</h2>
          <dl className="grid gap-6 md:grid-cols-2">
            {COLLECTED.map((c) => (
              <div key={c.what}>
                <dt className="league-spartan font-bold text-[22px]">{c.what}</dt>
                <dd className="text-[17px]">{c.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[17px] max-w-[62ch]">
            The server logs record requests and errors but never passwords, emails, tokens or lab values.
          </p>
        </section>

        <section aria-labelledby="share-h" className="flex flex-col gap-8">
          <h2 id="share-h" className="league-spartan font-bold text-[30px] md:text-[44px] leading-[1.1]">Who else handles it</h2>
          <dl className="grid gap-6 md:grid-cols-2">
            {SHARED.map((s) => (
              <div key={s.who} className="bg-C44 p-6">
                <dt className="league-spartan font-bold text-[22px]">{s.who}</dt>
                <dd className="text-[17px]">{s.what}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="try-h" className="flex flex-col gap-4">
          <h2 id="try-h" className="league-spartan font-bold text-[30px] md:text-[44px] leading-[1.1]">What you can do</h2>
          <ul className="flex flex-col gap-2 text-[18px]">
            <li><Link to="/report-analysis" className="text-C11 font-semibold underline">Analyse a report</Link>: values, scores, stage estimate and explanation.</li>
            <li><Link to="/simulator" className="text-C11 font-semibold underline">Try the what-if tool</Link>: drag a value and watch the scores move.</li>
            <li><Link to="/learn" className="text-C11 font-semibold underline">Read what each value means</Link>.</li>
            <li><Link to="/safety-check" className="text-C11 font-semibold underline">Check for warning signs</Link> that need a doctor today.</li>
            <li><Link to="/trends" className="text-C11 font-semibold underline">See your trends</Link> once you have analysed a report.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default AboutPage
