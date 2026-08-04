import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listModels, deleteModel, getMe } from '../api/client'
import ApiKeyCard from '../components/ApiKeyCard'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [me, setMe] = useState(null)

  const apiKey = localStorage.getItem('fleximl_api_key')
  const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

  useEffect(() => {
    if (!apiKey) { navigate('/'); return }
    
    // Fetch live user data and models
    Promise.all([
      getMe().then(r => setMe(r.data)).catch(() => {}),
      listModels().then(r => setModels(r.data)).catch(() => toast.error('Could not load models.'))
    ]).finally(() => setLoading(false))

  }, [apiKey, navigate])

  const handleDelete = async (e, modelId) => {
    e.stopPropagation()  // don't navigate to model detail
    if (confirmDelete !== modelId) {
      setConfirmDelete(modelId)
      setTimeout(() => setConfirmDelete(c => c === modelId ? null : c), 3500)
      return
    }
    setDeleting(modelId)
    setConfirmDelete(null)
    try {
      await deleteModel(modelId)
      setModels(prev => prev.filter(m => m.model_id !== modelId))
      toast.success('Model deleted successfully.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  if (!apiKey || !me) return null

  const problemBadge = (pt) => pt === 'classification'
    ? <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem' }}>CLASS</span>
    : <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem' }}>REGR</span>

  // Subscription calcs
  const limits = { free: 100, starter: 10000, pro: 100000 }
  const tier = me.subscription_tier || 'free'
  const maxCalls = limits[tier] || 100
  const used = me.api_calls_this_month || 0
  const progress = Math.min((used / maxCalls) * 100, 100)
  
  let daysLeft = 0
  if (me.subscription_expires_at) {
    let expires = me.subscription_expires_at;
    if (!expires.endsWith('Z') && !expires.includes('+')) {
      expires += 'Z';
    }
    const diff = new Date(expires) - new Date()
    daysLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
    if (tier === 'free' && daysLeft === 0) {
      // Hours left for free trial
      daysLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60))) + ' hours'
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1rem', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Subscription Banner */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(to right, rgba(23, 24, 30, 0.8), rgba(99, 102, 241, 0.05))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
            <div>
              <h3 style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Plan</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {tier}
                {tier === 'free' && <span style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>Trial</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{daysLeft}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tier === 'free' ? 'Time left' : 'Days left'}</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, opacity: 0.8 }}>
            Don't worry, we retain your models for 1 month if your subscription is over so you can renew!
          </p>
        </div>

        <div style={{ flex: 1, minWidth: 250 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>API Usage</span>
            <span>{used.toLocaleString()} / {maxCalls.toLocaleString()}</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-lighter)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress > 90 ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/pricing')}>
              View Plans
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/pricing')}>
              Upgrade
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        {/* Left: models */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
                <h2 style={{ marginBottom: '0.25rem' }}>Your Models</h2>
                <p style={{ fontSize: '0.85rem' }}>{models.length} trained model{models.length !== 1 ? 's' : ''}</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/train')}>
                ➕ Train New
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
                <p>Loading your models…</p>
              </div>
            ) : models.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>🤖</div>
                <h3 style={{ marginBottom: '0.5rem' }}>No models yet</h3>
                <p style={{ marginBottom: '1.5rem' }}>Train your first model to see it here.</p>
                <button className="btn btn-primary" onClick={() => navigate('/train')}>
                  🚀 Train First Model
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {models.map(m => (
                  <div
                    key={m.model_id}
                    className="card model-row"
                    onClick={() => navigate(`/models/${m.model_id}`)}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                          {m.model_label || m.model_name}
                        </div>
                        {m.model_label && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            {m.model_name}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {problemBadge(m.problem_type)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>
                          {m.accuracy_or_score != null ? `${(m.accuracy_or_score * 100).toFixed(2)}%` : '—'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {m.problem_type === 'classification' ? 'Accuracy' : 'R² Score'}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        {m.model_id}
                      </code>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                        </span>
                        <button
                          className={`btn btn-sm ${confirmDelete === m.model_id ? 'btn-danger-confirm' : 'btn-ghost'}`}
                          onClick={(e) => handleDelete(e, m.model_id)}
                          disabled={deleting === m.model_id}
                          style={{
                            color: confirmDelete === m.model_id ? 'var(--danger)' : 'var(--text-muted)',
                            borderColor: confirmDelete === m.model_id ? 'var(--danger)' : 'var(--border)',
                            background: confirmDelete === m.model_id ? 'rgba(239,68,68,0.12)' : 'transparent',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.65rem',
                          }}
                        >
                          {deleting === m.model_id
                            ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                            : confirmDelete === m.model_id
                              ? '⚠ Confirm?'
                              : '🗑 Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: API key + quick actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: '80px' }}>
            <ApiKeyCard apiKey={apiKey} userName={me.name} />

            <div className="card">
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-primary w-full" onClick={() => navigate('/train')}>
                  🚀 Train New Model
                </button>
                <a
                  href={`${API_URL}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline w-full"
                >
                  📖 API Docs (Swagger)
                </a>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Base URL</h3>
              <code style={{
                display: 'block',
                padding: '0.6rem 0.8rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontFamily: 'JetBrains Mono',
                color: 'var(--accent-light)',
                wordBreak: 'break-all',
              }}>
                {API_URL}
              </code>
            </div>
          </div>
        </div>

      <style>{`
        .model-row:hover {
          border-color: var(--border-accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-card), 0 0 20px var(--accent-glow);
        }
        @media (max-width: 768px) {
          .container > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
