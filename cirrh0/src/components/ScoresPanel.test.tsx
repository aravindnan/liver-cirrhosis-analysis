import React from 'react'
import { render, screen, within } from '@testing-library/react'
import ScoresPanel, { Score } from './ScoresPanel'

const fib4: Score = {
  id: 'fib4', name: 'FIB-4', purpose: 'Screens for advanced liver scarring.', value: 1.83, band: 'intermediate',
  bandLabel: 'Indeterminate', meaning: 'The result does not settle the question.',
  formula: 'Age × AST ÷ (platelets × √ALT)', cutoffs: 'Below 1.3: low.', inputs: { age: 55, 'ALT (U/L)': 36 },
  caveats: ['Less reliable under age 35.'], source: 'Sterling 2006',
}
const apri: Score = { id: 'apri', name: 'APRI', value: 0.25, band: 'low', bandLabel: 'Below the screening threshold', meaning: 'Less likely.' }
const missing: Score = { id: 'albi', name: 'ALBI', value: null, band: null, unavailableReason: 'Bilirubin must be above zero.' }

test('renders nothing when there are no scores', () => {
  const { container } = render(<ScoresPanel scores={[]} />)
  expect(container).toBeEmptyDOMElement()
  expect(render(<ScoresPanel scores={undefined} />).container).toBeEmptyDOMElement()
})

test('shows value, band in words, meaning and a not-a-diagnosis note', () => {
  render(<ScoresPanel scores={[fib4, apri]} />)
  const card = screen.getByTestId('score-fib4')
  expect(within(card).getByText('1.83')).toBeInTheDocument()
  expect(within(card).getByText(/Indeterminate/)).toBeInTheDocument() // band is text, not colour alone
  expect(within(card).getByText(/does not settle the question/)).toBeInTheDocument()
  expect(screen.getByText(/not a diagnosis/i)).toBeInTheDocument()
})

test('explains how each score is calculated, with the values used and caveats', () => {
  render(<ScoresPanel scores={[fib4]} />)
  const card = screen.getByTestId('score-fib4')
  expect(within(card).getByText('How this is calculated')).toBeInTheDocument()
  expect(within(card).getByText(/Age × AST/)).toBeInTheDocument()
  expect(within(card).getByText(/ALT \(U\/L\): 36/)).toBeInTheDocument()
  expect(within(card).getByText(/Less reliable under age 35/)).toBeInTheDocument()
})

test('a score that could not be calculated says why instead of showing a number', () => {
  render(<ScoresPanel scores={[missing]} />)
  const card = screen.getByTestId('score-albi')
  expect(within(card).getByText('Not calculated')).toBeInTheDocument()
  expect(within(card).getByText(/Bilirubin must be above zero/)).toBeInTheDocument()
})
