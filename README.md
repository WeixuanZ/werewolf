# Multiplayer Werewolf Game

A high-performance, cloud-native multiplayer implementation of the classic social deduction game Werewolf/Mafia.

Written by AI.

## Architecture

- **Backend**: Python 3.11 with **FastAPI** (REST + WebSockets).
- **Frontend**: React 19 + TypeScript with **Vite**, **TanStack Query**, and **Jotai**.
- **Persistence**: **Redis** (Game state persistence).
- **Infrastructure**: **Google Cloud (Terraform)** - Cloud Run & Compute Engine.

## Directory Structure

- `backend/`: FastAPI application code (Modular router structure, Pydantic schemas).
- `frontend/`: React application (Components, Store, Hooks).
- `terraform/`: Infrastructure as Code (GCP resources).
- `scripts/`: Helper scripts for local development and deployment.

## Getting Started

### Prerequisites
- Docker
- Node.js & Python 3.11+
- `uv` (Fast Python package installer)

### Local Development (Quick Start)

**Docker Compose (Recommended)**
```bash
./scripts/start_compose.sh
```
Access the game at [http://localhost:3000](http://localhost:3000).

### Manual Setup

**Backend**:
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -e .
uvicorn app.main:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Features

- Real-time interaction via WebSockets.
- Flexible role assignment algorithm.
- Robust state management with Redis.
- Type-safe, production-ready code structure.
