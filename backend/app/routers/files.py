from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import mimetypes
import os
import logging
from backend.core.file_service import file_service
from backend.app.utils import get_project_path
from backend.app.dependencies import verify_token

router = APIRouter(
    prefix="/api/projects/{project_name}",
    tags=["files"],
    dependencies=[Depends(verify_token)]
)

logger = logging.getLogger("FilesRouter")

# 从环境变量读取文件大小限制（字节），默认 100MB
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(100 * 1024 * 1024)))
logger.info(f"文件大小限制设置为: {MAX_FILE_SIZE / (1024 * 1024):.1f} MB")

class SaveFileRequest(BaseModel):
    filePath: str
    content: str

@router.get("/files")
async def get_project_files(project_name: str):
    return file_service.get_tree(get_project_path(project_name))

@router.get("/file")
async def read_project_file(project_name: str, filePath: str):
    try:
        return {"content": file_service.read_file(get_project_path(project_name), filePath)}
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

@router.get("/files/content")
async def read_project_file_content(project_name: str, filePath: str):
    try:
        root_path = get_project_path(project_name)

        if '..' in filePath.replace('\\', '/').split('/'):
            raise HTTPException(status_code=403, detail="Access denied: path traversal detected")

        full_path = os.path.normpath(os.path.join(root_path, filePath))
        real_root = os.path.realpath(root_path)
        
        if not os.path.exists(full_path):
             raise HTTPException(status_code=404, detail="File not found")
             
        real_full = os.path.realpath(full_path)

        if not real_full.startswith(real_root + os.sep) and real_full != real_root:
            raise HTTPException(status_code=403, detail="Access denied: path outside project directory")

        if not os.path.isfile(full_path):
            raise HTTPException(status_code=404, detail="File not found")

        file_size = os.path.getsize(full_path)
        if file_size > MAX_FILE_SIZE:
            max_size_mb = MAX_FILE_SIZE / (1024 * 1024)
            file_size_mb = file_size / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"文件过大（{file_size_mb:.1f} MB），超过最大限制（{max_size_mb:.1f} MB）。请下载文件查看或联系管理员增加限制。"
            )

        media_type = mimetypes.guess_type(full_path)[0] or "application/octet-stream"
        return FileResponse(full_path, media_type=media_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error serving file content: {e}")
        raise HTTPException(status_code=500, detail="Error reading file")

@router.put("/file")
async def save_project_file(project_name: str, req: SaveFileRequest):
    try:
        # 检查内容大小
        content_size = len(req.content.encode('utf-8'))
        if content_size > MAX_FILE_SIZE:
            max_size_mb = MAX_FILE_SIZE / (1024 * 1024)
            content_size_mb = content_size / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"文件内容过大（{content_size_mb:.1f} MB），超过最大限制（{max_size_mb:.1f} MB）。"
            )

        file_service.write_file(get_project_path(project_name), req.filePath, req.content)
        logger.info(f"文件保存成功: {req.filePath} ({content_size / 1024:.1f} KB)")
        return {"status": "success", "size": content_size}
    except HTTPException:
        raise
    except PermissionError as e:
        logger.error(f"文件权限错误: {e}")
        raise HTTPException(status_code=403, detail="没有权限写入文件")
    except OSError as e:
        logger.error(f"文件系统错误: {e}")
        raise HTTPException(status_code=500, detail="文件系统错误，无法保存文件")
    except Exception as e:
        logger.exception(f"保存文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存文件失败: {str(e)}")
