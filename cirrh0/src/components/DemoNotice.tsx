import React from 'react'

type DemoNoticeProps = { className?: string }

// Shown only in builds made with REACT_APP_DEMO_NOTICE=true (the demo and private beta deployment).
// Uploaded reports are stored at public file links until private storage is built, so people are
// asked to use test data. Read at render time so it can be switched in tests.
function DemoNotice({ className = '' }: DemoNoticeProps) {
  if (process.env.REACT_APP_DEMO_NOTICE !== 'true') return null
  return (
    <div
      role="note"
      className={`border-l-4 border-[#9a5b00] bg-[#fdf1dc] px-4 py-2 text-left text-[13px] text-[#4a2c00] ${className}`}
    >
      <strong>Demo version.</strong> Please do not enter real personal details or upload real medical
      records. Use made-up test data only.
    </div>
  )
}

export default DemoNotice
