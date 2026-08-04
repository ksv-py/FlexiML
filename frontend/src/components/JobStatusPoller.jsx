import { useEffect, useRef, useState } from 'react'
import { getJobStatus } from '../api/client'

const POLL_INTERVAL = 3000

export default function JobStatusPoller({ jobId, onCompleted }) {
  const [job, setJob] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!jobId) return

    const poll = async () => {
      try {
        const res = await getJobStatus(jobId)
        setJob(res.data)
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(intervalRef.current)
          if (res.data.status === 'completed') onCompleted(res.data)
        }
      } catch (_) {}
    }

    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [jobId])

  if (!job) return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
      <p>Connecting to training job…</p>
    </div>
  )

  const statusColor = {
    queued: 'var(--warning)',
    running: 'var(--accent-light)',
    completed: 'var(--success)',
    failed: 'var(--danger)',
  }[job.status] || 'var(--text-secondary)'

  const statusIcon = {
    queued: '⏳',
    running: '⚙️',
    completed: '✅',
    failed: '❌',
  }[job.status] || '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Status Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{statusIcon}</div>
        <h3 style={{ color: statusColor, marginBottom: '0.25rem', textTransform: 'capitalize' }}>
          {job.status}
        </h3>
        {job.status === 'running' && (
          <p style={{ fontSize: '0.85rem' }}>
            AutoML is evaluating models for you. This may take a few minutes…
          </p>
        )}
      </div>

      {/* Progress */}
      {(job.status === 'running' || job.status === 'queued') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>{job.current_model ? `Testing: ${job.current_model}` : 'Initializing…'}</span>
            <span>{job.progress_pct || 0}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${job.progress_pct || (job.status === 'queued' ? 5 : 20)}%` }}
            />
          </div>
          {job.total_models > 0 && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {job.models_evaluated} / {job.total_models} models evaluated
            </div>
          )}
        </div>
      )}

      {/* Models grid placeholder */}
      {job.status === 'running' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['LR','RF','XGB','LGBM','CB','DT','KNN','GB','Ada'].map((m, i) => (
            <div
              key={m}
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '100px',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: i < (job.models_evaluated || 0)
                  ? 'var(--success-subtle)'
                  : (job.current_model?.toLowerCase().includes(m.toLowerCase()) ? 'var(--accent-subtle)' : 'rgba(255,255,255,0.03)'),
                border: `1px solid ${i < (job.models_evaluated || 0) ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                color: i < (job.models_evaluated || 0) ? 'var(--success)' : 'var(--text-muted)',
                transition: 'all 0.3s ease',
              }}
            >
              {i < (job.models_evaluated || 0) ? '✓ ' : ''}{m}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {job.status === 'failed' && job.error && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          color: 'var(--danger)',
          fontSize: '0.85rem',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {job.error}
        </div>
      )}

      {/* Completed summary */}
      {job.status === 'completed' && (
        <div className="card card-accent" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Best model found</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {job.model_name}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)' }}>
            {(job.score * 100).toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {job.problem_type === 'classification' ? 'Accuracy' : 'R² Score'}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Job ID: <code style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-light)' }}>{jobId}</code>
        {job.status === 'running' && <span> · auto-refreshing every 3s</span>}
      </div>
    </div>
  )
}
