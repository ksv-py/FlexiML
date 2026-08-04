# Backend (FlexiML)

This folder contains the FastAPI backend for FlexiML.

Environment
- Copy `backend/.env.example` -> `backend/.env` and set values (notably `MONGO_URI`, `DB_NAME`, `REDIS_*`, `RAZORPAY_*`).

Local run (recommended for development)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-ci.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Full runtime (production)

```bash
# with full dependencies (may take long and require more memory)
pip install -r requirements.txt
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Docker (build an image and push to any container registry)

```bash
docker build -t fleximl-backend:latest .
docker run -e MONGO_URI="$MONGO_URI" -p 8000:8000 fleximl-backend:latest
```

Railway deploy (summary)
1. `railway init` (or create project on Railway dashboard)
2. Set required environment variables via the Railway dashboard or CLI:
   - `MONGO_URI`, `DB_NAME`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `RAZORPAY_KEY`, `RAZORPAY_SECRET`
3. `railway up` to deploy.

Notes
- Training heavy models on small PaaS plans is not recommended. Use Colab/Kaggle or an external GPU instance, then upload prebuilt model artifacts to MongoDB GridFS or an object storage service.
- If builds fail because of `xgboost`/`catboost`/`lightgbm`, consider building a Docker image locally and deploying the image instead of building in the cloud.
