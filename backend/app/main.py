import sys
import os
import logging

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
backend_dir = os.path.join(project_root, "backend")
for p in (project_root, backend_dir):
    if p not in sys.path:
        sys.path.append(p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routers import files
from backend.app.routers import frameworks
from backend.app.routers import ocr

# Import legacy app to keep existing endpoints working
# This also initializes the global variables in server.py
from backend.server import app as legacy_app

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)

app = FastAPI(title="IFlow Agent API")

# Configure CORS - 从环境变量读取允许的来源
import os

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3001")
allow_origins_list = [origin.strip() for origin in cors_origins.split(",")]

# 开发环境允许所有来源（仅用于开发）
dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"
if dev_mode:
    allow_origins_list = ["*"]
    import logging
    logger = logging.getLogger("CORS")
    logger.warning(
        "开发模式：允许所有 CORS 来源。"
        "生产环境请设置 DEV_MODE=false 并配置 CORS_ORIGINS。"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include new routers first (they take precedence)
app.include_router(files.router)
app.include_router(frameworks.router)
app.include_router(ocr.router)

# Include legacy routes
# This brings in all the endpoints defined in server.py
# Since files.router is included first, requests to /api/projects/{p}/files etc. 
# will be handled by the new router (with Auth), overriding the old ones.
app.include_router(legacy_app.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
