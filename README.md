# FlexiML

Lightweight orchestration for training, preprocessing and serving ML models via a FastAPI backend and a React frontend.

Repository layout
- `backend/` — FastAPI backend, model storage (MongoDB GridFS), training and prediction endpoints.
- `frontend/` — Vite + React single-page app that talks to the backend (`/api/v1`).

Quick start (backend)

1. Copy environment variables into `backend/.env` from `backend/.env.example`.
2. Create a Python virtualenv and install runtime dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

3. Run locally:

```powershell
cd backend
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
# or: python -m uvicorn backend.app.main:app --reload
```

Frontend quick start

```bash
cd frontend
npm install
npm run dev
```

Deploy notes
- Backend: recommended to deploy to Railway, Render, or a Docker host (note: heavy ML libs like `xgboost`, `catboost`, `lightgbm` may fail to build on free-tier builders). See `backend/README.md` for details.
- Frontend: recommended to deploy to Vercel for zero-config React hosting.

Repository already pushed to: https://github.com/ksv-py/FlexiML.git
