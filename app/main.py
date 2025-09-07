from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.health import router as health_router
from app.routes.dataset import router as dataset_router

app = FastAPI(
    title="FlexiML API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(dataset_router)

@app.get("/")
async def root():
    return{
        "message":"Welcome to FLexiML!",
        "version":"0.1.0"
    }