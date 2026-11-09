import React from 'react'
import { render, screen } from '@testing-library/react'
import DemoNotice from './DemoNotice'

const original = process.env.REACT_APP_DEMO_NOTICE
afterEach(() => {
  if (original === undefined) delete process.env.REACT_APP_DEMO_NOTICE
  else process.env.REACT_APP_DEMO_NOTICE = original
})

test('is hidden unless the demo flag is on', () => {
  delete process.env.REACT_APP_DEMO_NOTICE
  const { container } = render(<DemoNotice />)
  expect(container).toBeEmptyDOMElement()
  process.env.REACT_APP_DEMO_NOTICE = 'false'
  expect(render(<DemoNotice />).container).toBeEmptyDOMElement()
})

test('tells people to use test data only when the demo flag is on', () => {
  process.env.REACT_APP_DEMO_NOTICE = 'true'
  render(<DemoNotice />)
  const note = screen.getByRole('note')
  expect(note).toHaveTextContent(/do not enter real personal details or upload real medical records/i)
  expect(note).toHaveTextContent(/test data only/i)
})
