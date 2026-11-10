import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Page from '../components/Page'

export const RED_FLAGS = [
  'I have vomited blood, or what looks like coffee grounds',
  'My stools are black, tarry or bloody',
  'I feel confused, unusually sleepy or hard to wake',
  'I have fainted or nearly fainted',
  'My abdomen is swelling quickly or is very painful',
  'My eyes or skin have turned yellow in the last few days',
  'I have a fever with abdominal pain',
]

function SafetyCheckPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [checked, setChecked] = useState<boolean[]>(RED_FLAGS.map(() => false))
  const hits = checked.filter(Boolean).length

  return (
    <Page
      active="safety"
      title="Check for warning signs first"
      intro="A few symptoms need a doctor today, whatever your lab numbers say. Tick any that apply to you right now."
    >
      <fieldset className="flex flex-col gap-2 max-w-[70ch]">
        <legend className="league-spartan font-bold text-[24px] mb-2">Do any of these apply?</legend>
        {RED_FLAGS.map((text, i) => (
          <label key={text} className="flex items-start gap-3 p-4 bg-C44 text-[17px] cursor-pointer has-[:checked]:bg-[#fbe9e7]">
            <input
              type="checkbox" className="mt-[5px] h-5 w-5 accent-[#A90307]"
              checked={checked[i]} onChange={() => setChecked(checked.map((c, j) => (j === i ? !c : c)))}
            />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>

      <div role="status" className="max-w-[70ch]">
        {hits > 0 ? (
          <div className="bg-C11 text-white p-6 flex flex-col gap-2">
            <h2 className="league-spartan font-bold text-[28px]">Please get medical care today</h2>
            <p className="text-[17px]">Go to an emergency department or call your local emergency number. Do not wait for a report analysis. Bring a list of your medicines and, if you have them, your latest lab results.</p>
          </div>
        ) : (
          <div className="bg-C44 p-6 flex flex-col gap-2">
            <h2 className="league-spartan font-bold text-[24px]">Nothing ticked</h2>
            <p className="text-[17px]">That is not a clean bill of health. It only means none of these urgent signs apply today. If something changes, come back to this list, and see a doctor about any symptom that worries you.</p>
            <Link to="/report-analysis" className="mt-2 w-fit px-5 py-2 bg-C11 text-white font-semibold text-[15px] rounded-[2px]">Continue to report analysis</Link>
          </div>
        )}
      </div>
    </Page>
  )
}

export default SafetyCheckPage
