import './StepIndicator.css'

export default function StepIndicator({ steps, current }) {
  return (
    <div className="step-indicator">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'pending'
        return (
          <div key={i} className="step-item">
            <div className={`step-circle ${state}`}>
              {state === 'done' ? '✓' : i + 1}
            </div>
            <span className={`step-label ${state}`}>{step}</span>
            {i < steps.length - 1 && (
              <div className={`step-line ${i < current ? 'done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
