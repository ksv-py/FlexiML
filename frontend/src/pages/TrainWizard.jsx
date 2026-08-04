import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/StepIndicator'
import DatasetUpload from '../components/DatasetUpload'
import PreprocessingForm from '../components/PreprocessingForm'
import JobStatusPoller from '../components/JobStatusPoller'
import CodeSnippet from '../components/CodeSnippet'
import { startTraining } from '../api/client'
import toast from 'react-hot-toast'

const STEPS = ['Upload Data', 'Configure', 'Training', 'Results']

export default function TrainWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dataset, setDataset] = useState(null)
  const [training, setTraining] = useState(null)   // { preprocessorId, algorithm, model_label }
  const [jobId, setJobId] = useState(null)
  const [jobResult, setJobResult] = useState(null)

  const apiKey = localStorage.getItem('fleximl_api_key')
  const user = JSON.parse(localStorage.getItem('fleximl_user') || '{}')

  if (!apiKey) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 480, textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔑</div>
          <h2 style={{ marginBottom: '0.75rem' }}>API Key Required</h2>
          <p style={{ marginBottom: '1.5rem' }}>Register first to get your free API key and start training models.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
            Get Free API Key →
          </button>
        </div>
      </div>
    )
  }

  // Step 0: Upload Dataset
  const handleDatasetDone = (data) => {
    setDataset(data)
    setStep(1)
  }

  // Step 1: Configure preprocessing → trigger training
  const handlePreprocessingDone = async ({ preprocessorId, algorithm, model_label }) => {
    setTraining({ preprocessorId, algorithm, model_label })
    try {
      const res = await startTraining({
        dataset_id: dataset.datasetId,
        preprocessor_id: preprocessorId,
        algorithm,
        model_label: model_label || undefined,
      })
      setJobId(res.data.job_id)
      setStep(2)
      toast.success('Training started! Sit tight…')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to start training.')
    }
  }

  // Step 2: Job completed
  const handleJobCompleted = (result) => {
    setJobResult(result)
    setStep(3)
    toast.success('🎉 Your model is ready!', { duration: 5000 })
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {step === 0 && '📤 Upload your dataset'}
            {step === 1 && '🔧 Configure preprocessing'}
            {step === 2 && '⚙️ Training in progress…'}
            {step === 3 && '🎉 Your API is ready!'}
          </h1>
          <p style={{ maxWidth: 420, margin: '0 auto' }}>
            {step === 0 && 'Start with a CSV or Excel file. We handle the rest.'}
            {step === 1 && 'Tell us what you want to predict and how to handle the data.'}
            {step === 2 && 'AutoML is testing all algorithms. Grab a coffee ☕'}
            {step === 3 && 'Copy the endpoint and start predicting from your app!'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem 1.75rem' }}>
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {/* Step Content */}
        <div className="card">
          {step === 0 && <DatasetUpload onDone={handleDatasetDone} />}
          {step === 1 && dataset && (
            <PreprocessingForm
              datasetId={dataset.datasetId}
              analysisData={dataset.analysis}
              onDone={handlePreprocessingDone}
            />
          )}
          {step === 2 && jobId && (
            <JobStatusPoller jobId={jobId} onCompleted={handleJobCompleted} />
          )}
          {step === 3 && jobResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Model summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
                {[
                  { label: 'Best Model', val: jobResult.model_name },
                  { label: 'Problem Type', val: jobResult.problem_type, badge: true },
                  { label: jobResult.problem_type === 'classification' ? 'Accuracy' : 'R² Score',
                    val: `${(jobResult.score * 100).toFixed(2)}%`, highlight: true },
                ].map(item => (
                  <div key={item.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{item.label}</div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: item.highlight ? '1.6rem' : '1rem',
                      color: item.highlight ? 'var(--success)' : 'var(--text-primary)',
                    }}>
                      {item.badge ? (
                        <span className={`badge ${item.val === 'classification' ? 'badge-accent' : 'badge-warning'}`}>{item.val}</span>
                      ) : item.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Model ID */}
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Model ID</div>
                <div style={{
                  padding: '0.6rem 1rem',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.85rem',
                  color: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{jobResult.model_id}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    navigator.clipboard.writeText(jobResult.model_id)
                    toast.success('Model ID copied!')
                  }}>Copy</button>
                </div>
              </div>

              {/* Code Snippet */}
              <div>
                <h3 style={{ marginBottom: '0.75rem' }}>💻 Use in your project</h3>
                <CodeSnippet modelId={jobResult.model_id} apiKey={apiKey} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate(`/models/${jobResult.model_id}`)}>
                  📊 View Full Report
                </button>
                <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
                  🏠 Dashboard
                </button>
                <button className="btn btn-ghost" onClick={() => {
                  setStep(0); setDataset(null); setJobId(null); setJobResult(null)
                }}>
                  ➕ Train Another Model
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
