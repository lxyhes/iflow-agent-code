# Gemini Context: AI 工作台

## Project Overview

**AI 工作台** is an intelligent code assistant system designed to provide a comprehensive Web UI (Desktop & Mobile) for Claude Code and Cursor CLI. It features a responsive chat interface, integrated shell terminal, file browser, git explorer, and advanced AI capabilities like TaskMaster and automated code review.

### Architecture

The project adopts a microservices-like architecture with a React frontend and two distinct backend services:

1.  **Python Backend (Primary):**
    *   **Framework:** FastAPI + Uvicorn
    *   **Role:** Handles core agent logic, file system operations, git integration, local AI processing (AI 工作台 SDK), and RAG.
    *   **Database:** SQLite (`storage/`)
    *   **Location:** `backend/`

2.  **Java Backend (Enterprise/AI):**
    *   **Framework:** Spring Boot 3.2 + AgentScope
    *   **Role:** Integrates with Alibaba Cloud AI (Tongyi Qianwen), OCR services, and multi-agent interview systems.
    *   **Location:** `backend-java/`

3.  **Frontend:**
    *   **Framework:** React 18 + Vite
    *   **Styling:** Tailwind CSS + Lucide React
    *   **Location:** `frontend/`

## Key Directories & Files

*   **`backend/`**: Python backend source code.
    *   `core/`: Contains 40+ core services (Agent, Git, RAG, etc.).
    *   `app/`: FastAPI application routers and entry points.
    *   `requirements.txt`: Python dependencies.
*   **`backend-java/`**: Java backend source code.
    *   `src/`: Java source files.
    *   `pom.xml`: Maven configuration.
*   **`frontend/`**: React frontend source code.
    *   `src/`: React components and logic.
    *   `package.json`: Node.js dependencies and scripts.
*   **`storage/`**: Persistent storage for SQLite databases, backups, and user data.
*   **`scripts`**:
    *   `launch_all_fixed.bat` / `./start.sh`: **Primary startup scripts.**
    *   `backend/server.py`: Legacy entry point.
    *   `backend/app/main.py`: Modern entry point.

## Building and Running

### Prerequisites
*   Node.js v20+
*   Python 3.10+
*   Java 17+ (for Java backend)

### Quick Start
**Windows:**
```powershell
.\launch_all_fixed.bat
```

**Linux/macOS:**
```bash
./start.sh
```

### Manual Start

**Python Backend:**
```bash
cd backend
# Windows
set PYTHONPATH=%CD%
# Linux/Mac
export PYTHONPATH=$PWD
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Java Backend:**
```bash
cd backend-java
mvn spring-boot:run
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Access Points:**
*   Frontend: `http://localhost:5173`
*   Python API: `http://localhost:8000`
*   Java API: `http://localhost:8080`

## Development Conventions

### Python (Backend)
*   **Style:** Follow PEP 8.
*   **Formatting:** Use `black`.
*   **Linting:** Use `pylint` and `flake8`.
*   **Testing:** Use `pytest`.
    ```bash
    python -m pytest tests/
    ```
*   **Security:** ALL file system operations must use `PathValidator` to prevent traversal attacks.

### Java (Backend)
*   **Style:** Standard Java conventions.
*   **Build:** Maven.

### Frontend
*   **Naming:** **STRICT CamelCase** for all variables and API fields (e.g., `fullName`, NOT `full_name`). This is critical for data consistency.
*   **Style:** ESLint + Prettier.
*   **Components:** Functional components with Hooks.
*   **Testing:** `npm test`.

### Git Workflow
*   **Commit Messages:** Conventional Commits (e.g., `feat: add new feature`, `fix: resolve bug`).
*   **Branching:** Feature branches off `main`.

## Critical Notes
*   **Environment Variables:** Check `.env` (copy from `.env.example`) for `JWT_SECRET` and API keys.
*   **Naming Consistency:** Ensure strictly matched camelCase field names between Frontend and Backend (Java/Spring uses camelCase by default; Python Pydantic models should be configured or mapped to match).
