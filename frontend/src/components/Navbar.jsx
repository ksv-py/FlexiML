import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const apiKey = localStorage.getItem('fleximl_api_key')

  const handleLogout = () => {
    localStorage.removeItem('fleximl_api_key')
    localStorage.removeItem('fleximl_user')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">FlexiML</span>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {apiKey ? (
            <>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                Dashboard
              </Link>
              <Link to="/train" className={`nav-link ${isActive('/train') ? 'active' : ''}`}>
                Train Model
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/#features" className="nav-link">Features</Link>
              <Link to="/" className="nav-link">Docs</Link>
              <Link to="/" className="btn btn-primary btn-sm" onClick={() => {
                document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth' })
              }}>
                Get API Key
              </Link>
            </>
          )}
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  )
}
