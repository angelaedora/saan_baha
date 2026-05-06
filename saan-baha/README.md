# AI Flood Intelligence System

A modular flood susceptibility platform based on the Localized Urban Flood Susceptibility Mapping research.

## What this repository contains
- Reorganized notebooks and datasets from the original `Noah` project
- ML training and prediction modules
- RAG pipeline scaffolding for research-grounded explanations
- Agent orchestration scaffolding for planner, research, ML analysis, and reporting
- FastAPI service entrypoint and deployment/monitoring templates

## Quick start
1. Create a virtual environment
2. Install dependencies: `pip install -r requirements.txt`
3. Configure `.env` from `.env.example`
4. Run API: `uvicorn src.api.main:app --reload`

## Run with Docker (API + MongoDB)
1. Copy env template: `Copy-Item .env.example .env`
2. Start services: `docker compose -f deployment/docker-compose.yml up --build`
3. API is available at `http://localhost:8000`
4. MongoDB is available at `mongodb://localhost:27017`

## Key endpoints
- `POST /predict_flood`
- `POST /ask_ai`
- `GET /health`

## Notes
- Large geospatial artifacts from the source project are intentionally not copied into this repo.
- Trained baseline models are in `models/trained_models`.
