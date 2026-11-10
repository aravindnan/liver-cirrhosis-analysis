import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Logout from '@mui/icons-material/Logout'
import Menu from '@mui/icons-material/Menu'
import Close from '@mui/icons-material/Close'
import Person from '@mui/icons-material/Person'
import Timeline from '@mui/icons-material/Timeline'
import { LogoIcon } from './LogoIcon'
import LogoText from './LogoText'
import LogoutModal from '../modals/LogoutModal'
import { useAuth } from '../auth/AuthContext'

type NavbarProps = { activePage?: string }

function Navbar({ activePage }: NavbarProps) {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)
  const productsRef = useRef<HTMLLIElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const onHome = activePage === 'home'
  const linkColor = onHome ? 'text-white' : 'text-black'
  const menuSurface = onHome
    ? 'bg-[#000000e6] text-white'
    : 'bg-white text-black border-gray-200 border-[0.5px]'
  const itemClass = 'px-3 py-2 hover:bg-[#a9030628] focus-visible:bg-[#a9030628] rounded-[2px] flex items-center gap-2 w-full text-left'

  // Escape closes any open menu, and returns to the page behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProductsOpen(false)
        setUserOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Close a desktop menu when focus or the pointer leaves it.
  const closeOnLeave = (setter: (v: boolean) => void) => (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setter(false)
  }

  const initial = user?.fullName?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <header
      className={`fixed top-0 inset-x-0 z-20 text-[14px] backdrop-blur-[30px] ${onHome ? 'bg-[#00000080]' : 'bg-[#f7f7f788]'}`}
    >
      <nav aria-label="Main" className="mx-auto flex h-[70px] w-[92%] md:w-[80%] items-center justify-between">
        <Link to="/" aria-label="Cirrh0 home" className="flex flex-row items-center">
          <div className="rotate-infinte mb-[5px]" aria-hidden="true">
            <LogoIcon />
          </div>
          <LogoText look={`${linkColor} text-[26px] md:text-[30px]`} />
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex flex-row items-center gap-[50px] font-semibold">
          <li
            ref={productsRef}
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
            onBlur={closeOnLeave(setProductsOpen)}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={productsOpen}
              onClick={() => setProductsOpen((v) => !v)}
              className={`${linkColor} underline-offset-2 decoration-C11 decoration-2 ${productsOpen ? 'underline' : ''}`}
            >
              Products
            </button>
            {productsOpen && (
              <div className={`absolute left-[-10px] top-[100%] min-w-[220px] rounded-[2px] p-2 shadow-lg backdrop-blur-[30px] ${menuSurface}`}>
                <Link to="/mri-analysis" className={itemClass}>Slide Image Analysis</Link>
                <Link to="/report-analysis" className={itemClass}>Report Analysis</Link>
                <Link to="/simulator" className={itemClass}>What-if tool</Link>
                <Link to="/safety-check" className={itemClass}>Warning-sign check</Link>
              </div>
            )}
          </li>
          <li>
            <Link
              to="/learn"
              aria-current={activePage === 'learn' ? 'page' : undefined}
              className={`${activePage === 'learn' ? 'underline' : ''} ${linkColor} hover:underline underline-offset-2 decoration-C11 decoration-2`}
            >
              Learn
            </Link>
          </li>
          <li>
            <Link
              to="/about"
              aria-current={activePage === 'about' ? 'page' : undefined}
              className={`${activePage === 'about' ? 'underline' : ''} ${linkColor} hover:underline underline-offset-2 decoration-C11 decoration-2`}
            >
              About
            </Link>
          </li>
        </ul>

        {/* Desktop account area */}
        <div className="hidden md:flex flex-row items-center gap-2 font-semibold">
          {user ? (
            <div
              ref={userRef}
              className="relative"
              onMouseEnter={() => setUserOpen(true)}
              onMouseLeave={() => setUserOpen(false)}
              onBlur={closeOnLeave(setUserOpen)}
            >
              <button
                type="button"
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={userOpen}
                onClick={() => setUserOpen((v) => !v)}
                className={`w-[35px] h-[35px] flex text-[18px] justify-center items-center rounded-full font-semibold ${onHome ? 'bg-white text-C11' : 'bg-C11 text-white'}`}
              >
                {initial}
              </button>
              {userOpen && (
                <div className={`absolute right-0 top-[100%] min-w-[170px] rounded-[2px] p-2 shadow-lg backdrop-blur-[30px] ${menuSurface}`}>
                  <Link to="/profile" className={itemClass}>
                    <Person sx={{ fontSize: '16px' }} /> My Profile
                  </Link>
                  <Link to="/trends" className={itemClass}>
                    <Timeline sx={{ fontSize: '16px' }} /> My Trends
                  </Link>
                  <button type="button" onClick={() => setLogoutModal(true)} className={itemClass}>
                    <Logout sx={{ fontSize: '16px' }} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-row gap-[10px]">
              <Link
                to="/login"
                className={`flex items-center px-3 py-[2px] border border-transparent rounded-[2px] ${onHome ? 'hover:border-white text-white' : 'hover:border-C11 text-C11'}`}
              >
                Login
              </Link>
              <Link to="/signup" className="flex items-center px-3 py-[2px] bg-C11 text-white rounded-[2px]">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Phone menu button */}
        <button
          type="button"
          className={`md:hidden p-2 ${linkColor}`}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <Close /> : <Menu />}
        </button>
      </nav>

      {/* Phone menu */}
      {mobileOpen && (
        <div id="mobile-menu" className={`md:hidden px-[4%] pb-4 ${menuSurface}`}>
          <ul className="flex flex-col gap-1 font-semibold text-[16px]">
            <li><Link to="/mri-analysis" className={itemClass}>Slide Image Analysis</Link></li>
            <li><Link to="/report-analysis" className={itemClass}>Report Analysis</Link></li>
            <li><Link to="/simulator" className={itemClass}>What-if tool</Link></li>
            <li><Link to="/safety-check" className={itemClass}>Warning-sign check</Link></li>
            <li><Link to="/learn" className={itemClass}>Learn</Link></li>
            <li><Link to="/about" className={itemClass}>About</Link></li>
            {user ? (
              <>
                <li><Link to="/profile" className={itemClass}><Person sx={{ fontSize: '18px' }} /> My Profile</Link></li>
                <li><Link to="/trends" className={itemClass}><Timeline sx={{ fontSize: '18px' }} /> My Trends</Link></li>
                <li>
                  <button
                    type="button"
                    className={itemClass}
                    onClick={() => { setMobileOpen(false); setLogoutModal(true) }}
                  >
                    <Logout sx={{ fontSize: '18px' }} /> Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li><Link to="/login" className={itemClass}>Login</Link></li>
                <li><Link to="/signup" className={`${itemClass} bg-C11 text-white`}>Sign Up</Link></li>
              </>
            )}
          </ul>
        </div>
      )}

      {logoutModal && <LogoutModal setLogoutModal={setLogoutModal} />}
    </header>
  )
}

export default Navbar
