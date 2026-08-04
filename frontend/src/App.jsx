import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import TrainWizard from './pages/TrainWizard'
import ModelDetail from './pages/ModelDetail'
import Pricing from './pages/Pricing'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e2e8f0',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '12px',
            },
          }}
        />
        <Navbar />
        <main className="page">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/train" element={<TrainWizard />} />
            <Route path="/models/:id" element={<ModelDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
