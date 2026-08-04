import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { getModel } from '../api/client'
import CodeSnippet from '../components/CodeSnippet'
import toast from 'react-hot-toast'

const COLORS = ['#7c3aed','#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316']

export default function ModelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)

  const apiKey = localStorage.getItem('fleximl_api_key')

  useEffect(() => {
    if (!apiKey) { navigate('/'); return }
    getModel(id)
      .then(r => setModel(r.data))
      .catch(() => toast.error('Model not found or access denied.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
      <p>Loading model details…</p>
    </div>
  )

  if (!model) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
      <h2>Model not found</h2>
      <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/dashboard')}>
        ← Dashboard
      </button>
    </div>
  )

  const isClassification = model.problem_type === 'classification'
  const report = model.report || {}

  // Build chart data from report
  const chartData = Object.entries(report).map(([name, metrics]) => ({
    name: name.replace(' Classifier', '').replace(' Regressor', ''),
    score: isClassification
      ? Math.round((metrics.accuracy || 0) * 10000) / 100
      : Math.round(Math.max(0, metrics.r2 || 0) * 10000) / 100,
    isWinner: name === model.model_name,
  })).sort((a, b) => b.score - a.score)

  const bestModelReport = report[model.model_name] || {}

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 960 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: '0.75rem' }}>
              ← Dashboard
            </button>
            <h2 style={{ marginBottom: '0.25rem' }}>{model.model_label || model.model_name}</h2>
            {model.model_label && <p style={{ fontSize: '0.85rem' }}>{model.model_name}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span className={`badge ${isClassification ? 'badge-accent' : 'badge-warning'}`}>
                {model.problem_type}
              </span>
              <span className="badge badge-success">
                {(model.accuracy_or_score * 100).toFixed(2)}% {isClassification ? 'accuracy' : 'R²'}
              </span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/train')}>
            ➕ Train Another
          </button>
        </div>

        {/* Top metrics */}
        {isClassification && bestModelReport.accuracy != null && (
          <div className="grid-3" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'Accuracy', val: (bestModelReport.accuracy * 100).toFixed(2) + '%', color: 'var(--success)' },
              { label: 'Precision', val: (bestModelReport.precision * 100).toFixed(2) + '%', color: 'var(--accent-light)' },
              { label: 'F1 Score', val: (bestModelReport.f1_score * 100).toFixed(2) + '%', color: 'var(--info)' },
            ].map(m => (
              <div key={m.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{m.label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: m.color }}>{m.val}</div>
              </div>
            ))}
          </div>
        )}
        {!isClassification && bestModelReport.r2 != null && (
          <div className="grid-3" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'R² Score', val: bestModelReport.r2?.toFixed(4), color: 'var(--success)' },
              { label: 'MAE', val: bestModelReport.mae?.toFixed(4), color: 'var(--warning)' },
              { label: 'MSE', val: bestModelReport.mse?.toFixed(4), color: 'var(--accent-light)' },
            ].map(m => (
              <div key={m.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{m.label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: m.color }}>{m.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Chart: all models compared */}
        {chartData.length > 1 && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>
              🏆 All Models Compared ({isClassification ? 'Accuracy' : 'R²'} %)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                  formatter={(v) => [`${v}%`, isClassification ? 'Accuracy' : 'R²']}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isWinner ? 'var(--success)' : COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Code Snippet */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>💻 Use this model in your project</h3>
          <CodeSnippet modelId={id} apiKey={apiKey} />
        </div>

        {/* Classification report text */}
        {isClassification && bestModelReport.classification_report && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>📋 Classification Report</h3>
            <pre style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              background: 'rgba(0,0,0,0.3)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              overflowX: 'auto',
              lineHeight: 1.6,
            }}>
              {bestModelReport.classification_report}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
