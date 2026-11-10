import React from 'react'
import { render, screen } from '@testing-library/react'
import DemoNotice from './DemoNotice'

afterEach(() => vi.unstubAllEnvs())

test('is hidden unless the demo flag is on', () => {
  vi.stubEnv('VITE_DEMO_NOTICE', undefined as unknown as string)
  const { container } = render(<DemoNotice />)
  expect(container).toBeEmptyDOMElement()
  vi.stubEnv('VITE_DEMO_NOTICE', 'false')
  expect(render(<DemoNotice />).container).toBeEmptyDOMElement()
})

test('tells people to use test data only when the demo flag is on', () => {
  vi.stubEnv('VITE_DEMO_NOTICE', 'true')
  render(<DemoNotice />)
  const note = screen.getByRole('note')
  expect(note).toHaveTextContent(/do not enter real personal details or upload real medical records/i)
  expect(note).toHaveTextContent(/test data only/i)
})
