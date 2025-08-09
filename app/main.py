from fastapi import FastAPI
from app.routes import upload, preprocess
# , train, predict, analytics
app = FastAPI(
    title="FlexiML",
    description="End to End AutoMl Trainer and API Service.",
    version="1.0.0"
)

app.include_router(upload.router, prefix="/upload", tags=['Upload'])
app.include_router(preprocess.router, prefix="/preprocess", tags=["Preprocess"])
# app.include_router(train.router, prefix="/train", tags=["Training"])
# app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
# app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

@app.route("/")
def root():
    return {"message":"Welcome to FlexiML API"}

