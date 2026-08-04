import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { uploadDataset, previewDataset, analyzeDataset } from '../api/client'

export default function DatasetUpload({ onDone }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      setName(dropped.name.replace(/\.[^.]+$/, ''))
    }
  }, [])

  const handleUpload = async () => {
    if (!file || !name.trim()) return toast.error('Please select a file and enter a name.')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('file', file)
      const res = await uploadDataset(fd)
      const datasetId = res.data.dataset_id

      const [previewRes, analysisRes] = await Promise.all([
        previewDataset(datasetId, 8),
        analyzeDataset(datasetId),
      ])

      setPreview(previewRes.data)
      setAnalysis(analysisRes.data)
      toast.success('Dataset uploaded & analyzed!')
      onDone({ datasetId, preview: previewRes.data, analysis: analysisRes.data })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Drop Zone */}
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files[0]
            if (f) { setFile(f); setName(f.name.replace(/\.[^.]+$/, '')) }
          }}
        />
        {file ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {(file.size / 1024).toFixed(1)} KB · Click to change
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.6 }}>📁</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drop your CSV or Excel file here</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>or click to browse</div>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="form-group">
        <label className="form-label">Dataset Name</label>
        <input
          className="form-input"
          placeholder="e.g. Customer Churn Data"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary btn-lg w-full"
        onClick={handleUpload}
        disabled={loading || !file}
      >
        {loading ? <><span className="spinner" /> Uploading & Analyzing…</> : 'Upload & Continue →'}
      </button>

      {/* Preview Table */}
      {preview && (
        <div className="card" style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem' }}>📋 Preview</h3>
            {analysis && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-muted">{analysis.shape.rows} rows</span>
                <span className="badge badge-muted">{analysis.shape.cols} cols</span>
                {analysis.duplicates > 0 && <span className="badge badge-warning">{analysis.duplicates} duplicates</span>}
                {analysis.anomaly_flags?.length > 0 && (
                  <span className="badge badge-danger">⚠ {analysis.anomaly_flags.length} flag{analysis.anomaly_flags.length > 1 ? 's' : ''}</span>
                )}
              </div>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {Object.keys(preview.preview[0] || {}).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val === null ? <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>null</span> : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analysis?.anomaly_flags?.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {analysis.anomaly_flags.map((flag, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--warning)' }}>
                  <span>⚠</span> <span>{flag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.02);
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: var(--accent);
          background: var(--accent-subtle);
          transform: scale(1.005);
        }
        .drop-zone.has-file {
          border-color: var(--success);
          background: var(--success-subtle);
        }
      `}</style>
    </div>
  )
}
