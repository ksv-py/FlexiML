import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api/client'
import toast from 'react-hot-toast'
import './LandingPage.css'

const FEATURES = [
  { icon: '📤', title: 'Upload Any Dataset', desc: 'CSV or Excel — we handle the rest. Preview your data instantly.' },
  { icon: '🔧', title: 'Smart Preprocessing', desc: 'Auto-detect column types, fill missing values, encode categories.' },
  { icon: '🤖', title: 'AutoML Training', desc: 'We test 9+ algorithms and pick the best.' },
  { icon: '⚡', title: 'Live Endpoints & Quotas', desc: 'Your model becomes a POST endpoint with built-in rate-limiting and monthly API quotas.' },
  { icon: '💳', title: 'Automated Subscriptions', desc: 'Secure billing via Razorpay, Free Trials, and 1-month graceful model rentention policies.' },
  { icon: '🔑', title: 'Secure Access', desc: 'Protect your account using standard Password Logins, while issuing X-API-Keys for backend scripts.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Email and password required.')
    if (!isLogin && !form.name) return toast.error('Name required for registration.')
    
    setLoading(true)
    try {
      if (isLogin) {
        const res = await login(form.email, form.password)
        const { api_key, user_id, name, subscription_tier } = res.data
        localStorage.setItem('fleximl_api_key', api_key)
        localStorage.setItem('fleximl_user', JSON.stringify({ name, email: form.email, user_id, subscription_tier }))
        toast.success(`Welcome back, ${name}!`)
        navigate('/dashboard')
      } else {
        const res = await register(form.name, form.email, form.password)
        const { api_key, user_id } = res.data
        localStorage.setItem('fleximl_api_key', api_key)
        localStorage.setItem('fleximl_user', JSON.stringify({ name: form.name, email: form.email, user_id, subscription_tier: 'free' }))
        toast.success('Registration successful. Free Trial active! 🎉')
        navigate('/dashboard')
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const apiKey = localStorage.getItem('fleximl_api_key')

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-badge">
            <span className="pulse-dot" style={{ width: 7, height: 7 }} />
            <span>AutoML · Zero ML experience needed</span>
          </div>
          <h1 className="hero-title">
            Train AI models.<br />
            <span className="gradient-text">Get a live API.</span>
          </h1>
          <p className="hero-subtitle">
            Upload your dataset, pick a target, hit train — FlexiML tests 9+ algorithms,
            finds the best, and hands you a production-ready prediction endpoint.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {apiKey ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/train')}>
                🚀 Start Training
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => document.getElementById('register-section').scrollIntoView({ behavior: 'smooth' })}>
                Get Free API Key →
              </button>
            )}
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/dashboard')}>
              View Dashboard
            </button>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            {[['9+', 'ML Algorithms'], ['Auto', 'Problem Detection'], ['<1min', 'To Live API'], ['Free', 'Forever']].map(([val, label]) => (
              <div key={label} className="stat-item">
                <div className="stat-val">{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section container" id="features">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2>Everything you need to <span className="gradient-text">ship ML</span></h2>
          <p style={{ marginTop: '0.75rem', maxWidth: '500px', margin: '0.75rem auto 0' }}>
            From raw data to a callable API — no infrastructure, no MLOps headaches.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p style={{ fontSize: '0.88rem', marginTop: '0.4rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>
          4 steps to a <span className="gradient-text">live model</span>
        </h2>
        <div className="steps-row">
          {[
            { n: '01', title: 'Upload Dataset', desc: 'CSV or Excel — drag and drop.' },
            { n: '02', title: 'Configure Preprocessing', desc: 'Select target, encoding, drop columns.' },
            { n: '03', title: 'AutoML trains', desc: 'We run 9+ algos with GridSearch tuning.' },
            { n: '04', title: 'Use your API', desc: 'Call POST /predict/{model_id} from anywhere.' },
          ].map((s, i) => (
            <div key={s.n} className="how-step">
              <div className="how-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>{s.desc}</p>
              {i < 3 && <div className="how-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Register / Login */}
      <section id="register-section" className="register-section container">
        <div className="register-card card card-accent">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2>{isLogin ? 'Sign In to FlexiML' : 'Start your Free Trial'}</h2>
            <p style={{ marginTop: '0.5rem' }}>{isLogin ? 'Welcome back.' : 'No credit card required. Ready in seconds.'}</p>
          </div>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 420, margin: '0 auto' }}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input className="form-input" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@domain.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Authenticating…</> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => setIsLogin(!isLogin)} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>
                {isLogin ? 'Sign up here' : 'Sign in'}
              </span>
            </div>
          </form>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '3rem 1rem', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        FlexiML © 2025 · One-stop AutoML API Platform
      </footer>
    </div>
  )
}
