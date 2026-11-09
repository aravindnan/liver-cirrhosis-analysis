import React from 'react'
import { render, screen } from '@testing-library/react'
import Disclaimer from './Disclaimer'

test('always shows the educational-only notice and urgent-care guidance', () => {
  render(<Disclaimer />)
  expect(screen.getByRole('note')).toHaveTextContent(/not a medical diagnosis/i)
  expect(screen.getByRole('note')).toHaveTextContent(/urgent medical care/i)
})

test('shows extra context when provided', () => {
  render(<Disclaimer extra="Model is right about half the time." />)
  expect(screen.getByRole('note')).toHaveTextContent(/about half the time/)
})
