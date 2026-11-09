import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'
import { useAuth } from '../auth/AuthContext'

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }))
// The real modal pulls in the HTTP client; only the fact that it opens matters here.
jest.mock('../modals/LogoutModal', () => () => <div role="dialog">logout dialog</div>)

const mockedUseAuth = useAuth as jest.Mock
const signedIn = { user: { _id: 'u1', fullName: 'Asha Menon' }, status: 'authenticated' }
const signedOut = { user: null, status: 'anonymous' }

const renderNavbar = (auth: object, activePage = 'about') => {
  mockedUseAuth.mockReturnValue(auth)
  return render(<MemoryRouter><Navbar activePage={activePage} /></MemoryRouter>)
}

test('the phone menu is closed by default and opens and closes from the menu button', async () => {
  renderNavbar(signedOut)
  const button = screen.getByRole('button', { name: 'Open menu' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(document.getElementById('mobile-menu')).toBeNull()

  await userEvent.click(button)
  const toggle = screen.getByRole('button', { name: 'Close menu' })
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(toggle).toHaveAttribute('aria-controls', 'mobile-menu')
  expect(document.getElementById('mobile-menu')).not.toBeNull()

  await userEvent.click(toggle)
  expect(document.getElementById('mobile-menu')).toBeNull()
})

test('Escape closes the phone menu', async () => {
  renderNavbar(signedOut)
  await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  expect(document.getElementById('mobile-menu')).not.toBeNull()
  await userEvent.keyboard('{Escape}')
  expect(document.getElementById('mobile-menu')).toBeNull()
})

test('signed-out visitors see Login and Sign Up in the phone menu', async () => {
  renderNavbar(signedOut)
  await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  const menu = document.getElementById('mobile-menu') as HTMLElement
  expect(within(menu).getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login')
  expect(within(menu).getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup')
  expect(within(menu).queryByText('Logout')).toBeNull()
})

test('signed-in users get Profile and Logout on every page, and Logout opens the dialog', async () => {
  renderNavbar(signedIn, 'report-analysis') // logout used to appear only on three pages
  await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  const menu = document.getElementById('mobile-menu') as HTMLElement
  expect(within(menu).getByRole('link', { name: /My Profile/ })).toHaveAttribute('href', '/profile')
  await userEvent.click(within(menu).getByRole('button', { name: /Logout/ }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('the desktop Products and account menus are real buttons that toggle on click', async () => {
  renderNavbar(signedIn)
  const products = screen.getByRole('button', { name: 'Products' })
  expect(products).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(products)
  expect(products).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByRole('link', { name: 'Report Analysis' }).length).toBeGreaterThan(0)

  const account = screen.getByRole('button', { name: 'Account menu' })
  expect(account).toHaveTextContent('A') // initial of the user's name
  await userEvent.click(account)
  expect(account).toHaveAttribute('aria-expanded', 'true')
})

test('the main navigation is a labelled landmark and the current page is marked', () => {
  renderNavbar(signedOut, 'about')
  expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page')
})
