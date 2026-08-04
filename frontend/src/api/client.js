import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// Inject API key from localStorage on every request
client.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('fleximl_api_key')
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey
  }
  return config
})

export default client

// ── Auth ──────────────────────────────────────────────
export const register = (name, email, password) =>
  client.post('/auth/register', { name, email, password })

export const login = (email, password) =>
  client.post('/auth/login', { email, password })

export const getMe = () => client.get('/auth/me')

// ── Datasets ─────────────────────────────────────────
export const uploadDataset = (formData) =>
  client.post('/datasets/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const listDatasets = () => client.get('/datasets/')

export const previewDataset = (id, limit = 10) =>
  client.get(`/datasets/${id}/preview?limit=${limit}`)

export const analyzeDataset = (id) =>
  client.get(`/analysis/datasets/${id}`)

// ── Preprocessing ─────────────────────────────────────
export const createPreprocessor = (payload) =>
  client.post('/preprocessing/', payload)

// ── Training ─────────────────────────────────────────
export const startTraining = (payload) =>
  client.post('/train/start', payload)

export const getJobStatus = (jobId) =>
  client.get(`/train/job/${jobId}`)

export const listModels = () =>
  client.get('/train/model/list')

export const getModel = (modelId) =>
  client.get(`/train/model/${modelId}`)

// ── Predict ───────────────────────────────────────────
export const predict = (modelId, data) =>
  client.post(`/predict/${modelId}`, { data })

// ── Model Management ──────────────────────────────────
export const deleteModel = (modelId) =>
  client.delete(`/predict/${modelId}`)

// ── Payments ──────────────────────────────────────────
export const createOrder = (plan) =>
  client.post('/payments/create-order', { plan })

export const triggerMockWebhook = (plan) =>
  client.post('/payments/mock-webhook', { plan })
