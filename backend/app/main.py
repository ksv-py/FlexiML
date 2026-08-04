from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.routes.health import router as health_router
from app.routes.dataset import router as dataset_router
from app.routes.preprocessing import router as preprocessing_router
from app.routes.train import router as training_router
from app.routes.predict import router as predict_router
from app.routes.auth import router as auth_router
from app.routes.analysis import router as analysis_router
from app.routes.payments import router as payments_router
from app.services.cleanup import cleanup_free_models_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check + Start background cleanup
    task = asyncio.create_task(cleanup_free_models_loop())
    yield
    task.cancel()

app = FastAPI(
    title="FlexiML API",
    description="One-stop AutoML-as-a-Service. Upload data, train models, get a live prediction API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(health_router,       prefix=API_PREFIX)
app.include_router(auth_router,         prefix=API_PREFIX)
app.include_router(dataset_router,      prefix=API_PREFIX)
app.include_router(preprocessing_router, prefix=API_PREFIX)
app.include_router(training_router,     prefix=API_PREFIX)
app.include_router(predict_router,      prefix=API_PREFIX)
app.include_router(analysis_router,     prefix=API_PREFIX)
app.include_router(payments_router,     prefix=API_PREFIX)


@app.get("/")
async def root():
    return {
        "message": "Welcome to FlexiML API!",
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": "/api/v1",
    }
