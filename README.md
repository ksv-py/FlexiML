# 📦 FlexiML — End-to-End AutoML Trainer & API Platform

## 🚀 Project Overview

FlexiML is a modular, scalable AutoML platform that enables users to:

* Upload datasets (CSV/XLSX)
* Preprocess data with user-defined or automatic pipelines
* Train ML models (manual/auto)
* Analyze visual metrics
* Instantly deploy models via REST APIs

It is designed to minimize DevOps overhead and empower developers, analysts, and startups to rapidly prototype and deploy ML workflows.

---

## 🧠 Key Differentiators

* One-click model deployment with persistent asset IDs
* Visual analytics throughout the pipeline
* Supports both manual and AutoML-based training
* MongoDB + GridFS for efficient storage and versioning
* Modular service-oriented FastAPI backend and React frontend

---

## 📦 Core Features (v1.0)

### 🔹 Dataset Upload

* Accepts `.csv` and `.xlsx`
* Stored via MongoDB GridFS
* Returns a unique `file_id`

### 🔹 Dataset Preview

* Infers data types, missing values, imbalance
* Classifies columns into: numerical, categorical, target

### 🔹 Preprocessing

* Options: mean, median, mode imputation; optional scaling/encoding
* Saves transformation pipeline to GridFS → returns `preprocessor_id`

### 🔹 Model Training

* Manual or automatic model selection
* Hyperparameter tuning (optional)
* Trained model saved to GridFS → returns `model_id`
* Returns training metrics

### 🔹 Prediction Endpoint

* Requires: `file_id`, `preprocessor_id`, `model_id`
* Returns real-time predictions

### 🔹 Analytics Dashboard

* Missing value summary, feature distribution plots
* Model Evaluation: Accuracy, F1, Confusion Matrix

---

## 📈 Extended Features (v1.5 – v2.0)

* Auto EDA Reports
* Auto Feature Engineering (binning, outlier detection)
* Model Leaderboard
* SHAP/LIME Explainability
* Retraining on new datasets
* File tracking, logging, and user authentication

## 🔬 Future Roadmap (v3.0+)

* Fine-tuning LLMs on private data
* NLP & Vision support
* Bias Detection & Explainability
* Synthetic Data Generation
* SaaS tiers + VS Code extension

---

## 🧑‍💻 Tech Stack

* **Backend**: FastAPI, Pydantic
* **Frontend**: React, TailwindCSS, Recharts
* **ML Engine**: scikit-learn, pandas, matplotlib
* **Database**: MongoDB + GridFS
* **Deployment**: Docker, GitHub Actions, Render/EC2
* **Security**: API Key Auth, Rate Limiting, File Expiry

---

## 🛠️ System Architecture

### 📊 Architecture Overview

* Frontend (React) interacts with FastAPI backend
* FastAPI handles dataset ingestion, processing, and model training
* MongoDB GridFS stores all datasets, preprocessors, and models
* Frontend fetches analytics and visualizations via asset IDs
* REST API is available for plug-n-play deployment

### 📁 Component Breakdown

* **Frontend**: File upload, preprocessing config, training UI, analytics dashboard
* **Backend**:

  * Upload & Preprocess Service
  * Training Engine
  * Prediction & Evaluation Module
  * MongoDB Persistence Layer

### 🔄 Data Flow

* UI → FastAPI → GridFS/MongoDB
* FastAPI → ML pipeline → returns IDs and metrics
* UI → displays results, allows prediction

---

## 🧩 Model Registry & Preprocessing Pipeline

* Every model and preprocessing step saved with unique IDs
* GridFS used for versioned storage and reuse
* Models and transformers are persisted, trackable, and deployable

---

## 📜 OpenAPI & API Docs

* Full OpenAPI 3.1 spec in `openapi.json`
* Swagger UI-ready
* Endpoints:

  * `/upload` → dataset upload
  * `/preview/{file_id}` → basic insights
  * `/preprocess` → transformer pipeline
  * `/train` → model training
  * `/predict` → model inference
  * `/metrics/{model_id}` → evaluation stats

---

## 📅 Version Timeline

| Version | Features                              | Timeline   |
| ------- | ------------------------------------- | ---------- |
| v1.0    | Upload → Preprocess → Train → Predict | Week 1–3   |
| v1.5    | Analytics + Retrain                   | Week 4–6   |
| v2.0    | Auth, SaaS, File Logs                 | Week 7–10  |
| v3.0    | LLM, NLP, CV, SHAP                    | Week 11–14 |

---

## 🧾 License

*To be decided*

## 📄 Contributions

*Coming soon in **`CONTRIBUTING.md`** once open source is enabled.*
