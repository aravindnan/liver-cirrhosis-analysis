import React from 'react'

type DisclaimerProps = { className?: string; extra?: string }

function Disclaimer({ className = '', extra }: DisclaimerProps) {
  return (
    <div
      role="note"
      className={`border-l-4 border-C11 bg-[#a9030614] px-4 py-3 text-left text-[13px] ${className}`}
    >
      <p>
        <strong>Demo project.</strong> This is a student project that uses an automated research model. It is
        not a medical device, does not give a diagnosis, and does not replace advice from a qualified
        doctor.
      </p>
      {extra && <p className="mt-1">{extra}</p>}
      <p className="mt-1">
        Seek urgent medical care for vomiting blood, black or bloody stools, confusion or
        unusual sleepiness, fainting, or a rapidly swelling abdomen.
      </p>
    </div>
  )
}

export default Disclaimer
