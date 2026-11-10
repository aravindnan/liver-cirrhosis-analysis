import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import type { Mock } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth, useAuthPage } from './AuthContext'
import RequireAuth from './RequireAuth'
import { getUserById } from '../services/userServices'
import { readSessionHint, writeSessionHint } from '../services/sessionHint'

vi.mock('../services/userServices', () => ({ getUserById: vi.fn() }))
const mockedGetUser = getUserById as unknown as Mock

const profile = { id: 'u1', username: 'asha', email: 'a@b.co', fullName: 'Asha', age: 40, gender: 'female', reportAnalysisSet: [], mriAnalysisSet: [] }

function Probe() {
  const { status, user } = useAuth()
  return <div>{status}:{user?.username ?? 'none'}</div>
}

const renderProbe = () => render(<AuthProvider><Probe /></AuthProvider>)

beforeEach(() => {
  localStorage.clear()
  mockedGetUser.mockReset()
})

test('without a session hint the visitor is anonymous and no request is made', () => {
  renderProbe()
  expect(screen.getByText('anonymous:none')).toBeInTheDocument()
  expect(mockedGetUser).not.toHaveBeenCalled()
})

test('with a hint it loads the profile and becomes authenticated', async () => {
  writeSessionHint('u1')
  mockedGetUser.mockResolvedValue(profile)
  renderProbe()
  expect(screen.getByText('loading:none')).toBeInTheDocument()
  expect(await screen.findByText('authenticated:asha')).toBeInTheDocument()
  expect(mockedGetUser).toHaveBeenCalledWith('u1')
})

test('a 401 means the session ended: hint is cleared and the user is anonymous', async () => {
  writeSessionHint('u1')
  mockedGetUser.mockRejectedValue({ response: { status: 401 } })
  renderProbe()
  expect(await screen.findByText('anonymous:none')).toBeInTheDocument()
  expect(readSessionHint()).toBeNull()
})

test('a network failure is an error state, not a logout, and keeps the hint', async () => {
  writeSessionHint('u1')
  mockedGetUser.mockRejectedValue({ code: 'ERR_NETWORK' })
  renderProbe()
  expect(await screen.findByText('error:none')).toBeInTheDocument()
  expect(readSessionHint()).not.toBeNull()
})

test('a response that is not a user document is rejected', async () => {
  writeSessionHint('u1')
  mockedGetUser.mockResolvedValue({ message: 'oops' })
  renderProbe()
  expect(await screen.findByText('error:none')).toBeInTheDocument()
})

test('refresh after login picks up the new session; signedOut clears it', async () => {
  mockedGetUser.mockResolvedValue(profile)
  let api: ReturnType<typeof useAuth>
  function Grab() { api = useAuth(); return <Probe /> }
  render(<AuthProvider><Grab /></AuthProvider>)
  expect(screen.getByText('anonymous:none')).toBeInTheDocument()

  writeSessionHint('u1')
  await act(async () => { await api!.refresh() })
  expect(screen.getByText('authenticated:asha')).toBeInTheDocument()

  act(() => api!.signedOut())
  expect(screen.getByText('anonymous:none')).toBeInTheDocument()
  expect(readSessionHint()).toBeNull()
})

test('useAuthPage maps status to the legacy page states', async () => {
  writeSessionHint('u1')
  mockedGetUser.mockRejectedValue({ code: 'ERR_NETWORK' })
  function Page() {
    const { pageLoading, networkError } = useAuthPage()
    return <div>{pageLoading}/{String(networkError)}</div>
  }
  render(<AuthProvider><Page /></AuthProvider>)
  expect(screen.getByText('not-loaded/false')).toBeInTheDocument()
  expect(await screen.findByText('error/true')).toBeInTheDocument()
})

test('useAuth outside the provider fails loudly', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Probe />)).toThrow(/AuthProvider/)
  spy.mockRestore()
})

describe('RequireAuth', () => {
  const app = (start: string) => (
    <AuthProvider>
      <MemoryRouter initialEntries={[start]}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/profile" element={<RequireAuth><div>secret profile</div></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )

  test('sends anonymous visitors to the login page', () => {
    render(app('/profile'))
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('secret profile')).not.toBeInTheDocument()
  })

  test('renders the page for a signed-in user', async () => {
    writeSessionHint('u1')
    mockedGetUser.mockResolvedValue(profile)
    render(app('/profile'))
    await waitFor(() => expect(screen.getByText('secret profile')).toBeInTheDocument())
  })

  test('an expired server session redirects to login', async () => {
    writeSessionHint('u1')
    mockedGetUser.mockRejectedValue({ response: { status: 401 } })
    render(app('/profile'))
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })
})
