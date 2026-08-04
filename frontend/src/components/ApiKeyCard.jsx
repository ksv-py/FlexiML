import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ApiKeyCard({ apiKey, userName }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    toast.success('API Key copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const masked = apiKey ? `flexi_${'•'.repeat(24)}` : ''
  const display = revealed ? apiKey : masked

  return (
    <div className="card card-accent" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
            Your API Key
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            👋 {userName || 'Developer'}
          </div>
        </div>
        <div className="pulse-dot" />
      </div>

      <div style={{
        padding: '0.75rem 1rem',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.85rem',
        color: 'var(--accent-light)',
        letterSpacing: '0.02em',
        wordBreak: 'break-all',
      }}>
        {display}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setRevealed(r => !r)} style={{ flex: 1 }}>
          {revealed ? '🙈 Hide' : '👁 Reveal'}
        </button>
        <button className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline'}`} onClick={copy} style={{ flex: 2 }}>
          {copied ? '✓ Copied!' : '📋 Copy Key'}
        </button>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        Add this to your requests as: <code style={{ color: 'var(--accent-light)', fontFamily: 'JetBrains Mono' }}>X-API-Key: {apiKey?.slice(0, 12)}…</code>
      </div>
    </div>
  )
}
