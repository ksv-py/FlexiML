import { useState } from 'react'
import toast from 'react-hot-toast'
import { createPreprocessor } from '../api/client'

const ALGORITHMS = [
  { value: 'auto', label: '🤖 Auto (Best Model)', desc: 'Tries all available algorithms and picks the best' },
  { value: 'Logistic Regression', label: 'Logistic Regression', desc: 'Classification' },
  { value: 'Random Forest Classifier', label: 'Random Forest', desc: 'Classification' },
  { value: 'XGBoost Classifier', label: 'XGBoost', desc: 'Classification' },
  { value: 'LGBM Classifier', label: 'LightGBM', desc: 'Classification' },
  { value: 'Linear Regression', label: 'Linear Regression', desc: 'Regression' },
  { value: 'Random Forest Regressor', label: 'Random Forest Regressor', desc: 'Regression' },
  { value: 'XGBoost Regressor', label: 'XGBoost Regressor', desc: 'Regression' },
]

export default function PreprocessingForm({ datasetId, analysisData, onDone }) {
  const columns = analysisData ? Object.keys(analysisData.columns) : []

  const [form, setForm] = useState({
    target_column: '',
    missing_value_strategy: 'mean',
    encoding_strategy: 'label',
    drop_columns: [],
    model_label: '',
    algorithm: 'auto',
  })
  const [loading, setLoading] = useState(false)

  const toggleDrop = (col) => {
    setForm(f => ({
      ...f,
      drop_columns: f.drop_columns.includes(col)
        ? f.drop_columns.filter(c => c !== col)
        : [...f.drop_columns, col]
    }))
  }

  const handleSubmit = async () => {
    if (!form.target_column) return toast.error('Please select a target column.')
    setLoading(true)
    try {
      const res = await createPreprocessor({
        dataset_id: datasetId,
        target_column: form.target_column,
        missing_value_strategy: form.missing_value_strategy,
        encoding_strategy: form.encoding_strategy,
        drop_columns: form.drop_columns,
      })
      toast.success('Preprocessing pipeline created!')
      onDone({
        preprocessorId: res.data.preprocessor_id,
        algorithm: form.algorithm,
        model_label: form.model_label,
      })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create preprocessor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Target Column */}
      <div className="form-group">
        <label className="form-label">🎯 Target Column (what you want to predict)</label>
        <select className="form-select" value={form.target_column} onChange={e => setForm(f => ({ ...f, target_column: e.target.value }))}>
          <option value="">— Select target —</option>
          {columns.map(col => <option key={col} value={col}>{col}</option>)}
        </select>
      </div>

      {/* Drop Columns */}
      {columns.length > 0 && (
        <div className="form-group">
          <label className="form-label">🗑 Columns to Drop (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
            {columns.filter(c => c !== form.target_column).map(col => {
              const colInfo = analysisData?.columns?.[col]
              const isDrop = form.drop_columns.includes(col)
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => toggleDrop(col)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '100px',
                    border: `1px solid ${isDrop ? 'var(--danger)' : 'var(--border)'}`,
                    background: isDrop ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                    color: isDrop ? 'var(--danger)' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  {isDrop ? '✕' : ''} {col}
                  {colInfo && <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>({String(colInfo.dtype).replace('64', '')})</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Missing Value Strategy */}
        <div className="form-group">
          <label className="form-label">Missing Value Strategy</label>
          <select className="form-select" value={form.missing_value_strategy} onChange={e => setForm(f => ({ ...f, missing_value_strategy: e.target.value }))}>
            <option value="mean">Mean (numeric)</option>
            <option value="median">Median (numeric)</option>
            <option value="most_frequent">Most Frequent</option>
          </select>
        </div>

        {/* Encoding */}
        <div className="form-group">
          <label className="form-label">Categorical Encoding</label>
          <select className="form-select" value={form.encoding_strategy} onChange={e => setForm(f => ({ ...f, encoding_strategy: e.target.value }))}>
            <option value="label">Label Encoding (ordinal)</option>
            <option value="one_hot">One-Hot Encoding</option>
          </select>
        </div>
      </div>

      <div className="divider" />

      {/* Algorithm */}
      <div className="form-group">
        <label className="form-label">🤖 Training Algorithm</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
          {ALGORITHMS.map(algo => (
            <label
              key={algo.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${form.algorithm === algo.value ? 'var(--border-accent)' : 'var(--border)'}`,
                background: form.algorithm === algo.value ? 'var(--accent-subtle)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="algorithm"
                value={algo.value}
                checked={form.algorithm === algo.value}
                onChange={() => setForm(f => ({ ...f, algorithm: algo.value }))}
                style={{ accentColor: 'var(--accent)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{algo.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{algo.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Model Label */}
      <div className="form-group">
        <label className="form-label">Model Label (optional)</label>
        <input
          className="form-input"
          placeholder="e.g. Churn Predictor v1"
          value={form.model_label}
          onChange={e => setForm(f => ({ ...f, model_label: e.target.value }))}
        />
      </div>

      <button className="btn btn-primary btn-lg w-full" onClick={handleSubmit} disabled={loading}>
        {loading ? <><span className="spinner" /> Creating Pipeline…</> : 'Create Pipeline & Train →'}
      </button>
    </div>
  )
}
