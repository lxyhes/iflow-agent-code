from __future__ import annotations

import json
import io
import logging
import mimetypes
import os
import time
import secrets
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse, StreamingResponse

from backend.app.utils import get_project_path
from backend.core.ocr_local_pipeline import decode_image_to_rgb_numpy, preprocess_for_ocr, render_pdf_pages
from backend.core.ocr_service import get_ocr_service

router = APIRouter(
    prefix="/api/projects/{project_name}/ocr",
    tags=["ocr"],
)

logger = logging.getLogger("OCRRouter")

MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(100 * 1024 * 1024)))
PREVIEW_TTL_SECONDS = int(os.getenv("OCR_PREVIEW_TTL_SECONDS", "600"))
_preview_cache: Dict[str, Dict[str, Any]] = {}


def _purge_preview_cache(now: float):
    expired = [k for k, v in _preview_cache.items() if (now - float(v.get("created_at", 0))) > PREVIEW_TTL_SECONDS]
    for k in expired:
        _preview_cache.pop(k, None)


def _parse_page_range(value: str) -> Optional[List[int]]:
    s = str(value or "").strip()
    if not s:
        return None
    if s.startswith("["):
        try:
            arr = json.loads(s)
            if isinstance(arr, list):
                out = []
                for x in arr:
                    try:
                        out.append(int(x) - 1)
                    except Exception:
                        continue
                return sorted(set([i for i in out if i >= 0]))
        except Exception:
            return None
    parts = [p.strip() for p in s.split(",") if p.strip()]
    out: List[int] = []
    for p in parts:
        if "-" in p:
            a, b = p.split("-", 1)
            try:
                start = int(a)
                end = int(b)
            except Exception:
                continue
            if start <= 0 or end <= 0:
                continue
            if end < start:
                start, end = end, start
            out.extend(list(range(start - 1, end)))
        else:
            try:
                out.append(int(p) - 1)
            except Exception:
                continue
    return sorted(set([i for i in out if i >= 0])) or None


@router.get("/preview")
async def get_preview_image(
    project_name: str,
    token: str,
    page: int = 1,
    max_side: int = 900,
):
    _ = get_project_path(project_name)
    now = time.time()
    _purge_preview_cache(now)
    entry = _preview_cache.get(token)
    if not entry:
        raise HTTPException(status_code=404, detail="预览已过期或不存在")

    max_side = int(max_side or 900)
    max_side = max(300, min(1600, max_side))

    mime = entry.get("mime")
    if mime == "application/pdf":
        pdf_bytes = entry.get("pdf_bytes")
        if not isinstance(pdf_bytes, (bytes, bytearray)):
            raise HTTPException(status_code=404, detail="预览数据缺失")
        pages = render_pdf_pages(bytes(pdf_bytes), dpi=int(entry.get("dpi") or 200), page_indices=[int(page) - 1])
        if not pages:
            raise HTTPException(status_code=404, detail="页码不存在")
        _, rgb = pages[0]
    else:
        image_bytes = entry.get("image_bytes")
        if not isinstance(image_bytes, (bytes, bytearray)):
            raise HTTPException(status_code=404, detail="预览数据缺失")
        rgb, _ = decode_image_to_rgb_numpy(bytes(image_bytes))

    try:
        from PIL import Image as PILImage

        img = PILImage.fromarray(rgb)
        w0, h0 = img.size
        m0 = max(w0, h0)
        if m0 > max_side:
            scale = float(max_side) / float(m0)
            img = img.resize((max(1, int(w0 * scale)), max(1, int(h0 * scale))), PILImage.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80, optimize=True)
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/jpeg")
    except Exception as e:
        logger.exception(f"生成预览失败: {e}")
        raise HTTPException(status_code=500, detail="生成预览失败")


@router.post("/recognize")
async def recognize(
    project_name: str,
    file: UploadFile = File(...),
    technology: str = Form("rapidocr"),
    dpi: int = Form(200),
    preprocess: bool = Form(True),
    deskew: bool = Form(True),
    max_side: int = Form(2200),
    page_range: str = Form(""),
    return_images: bool = Form(True),
    preview_max_side: int = Form(900),
    max_preview_pages: int = Form(1),
):
    _ = get_project_path(project_name)

    if not file:
        raise HTTPException(status_code=400, detail="缺少文件")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="空文件")
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="文件过大")

    content_type = (file.content_type or "").lower()
    guessed_type = mimetypes.guess_type(file.filename or "")[0] or ""
    mime = content_type or guessed_type

    service = get_ocr_service((technology or "rapidocr").lower())

    try:
        now = time.time()
        _purge_preview_cache(now)
        preview_token = None
        if mime == "application/pdf" or (file.filename or "").lower().endswith(".pdf"):
            indices = _parse_page_range(page_range)
            pages = render_pdf_pages(raw, dpi=dpi, page_indices=indices)
            if return_images:
                preview_token = secrets.token_urlsafe(16)
                _preview_cache[preview_token] = {"created_at": now, "mime": "application/pdf", "pdf_bytes": raw, "dpi": int(dpi or 200)}
            results: List[Dict[str, Any]] = []
            texts: List[str] = []
            for page_index, rgb in pages:
                if preprocess:
                    rgb = preprocess_for_ocr(rgb, max_side=max_side, deskew=deskew)
                page_h, page_w = rgb.shape[:2]
                r = await service.process_rgb_array(rgb)
                page_item: Dict[str, Any] = {
                    "page": page_index + 1,
                    "success": bool(r.get("success")),
                    "text": r.get("text", ""),
                    "blocks": r.get("blocks", []),
                    "width": int(page_w),
                    "height": int(page_h),
                }
                if return_images and preview_token and len(results) < int(max_preview_pages or 0):
                    page_item["preview_url"] = f"/api/projects/{project_name}/ocr/preview?token={preview_token}&page={page_index + 1}&max_side={int(preview_max_side or 900)}"

                results.append(page_item)
                if r.get("success") and r.get("text"):
                    texts.append(r.get("text"))
            return JSONResponse(
                {
                    "success": True,
                    "technology": technology,
                    "total_pages": len(results),
                    "text": "\n\n".join(texts),
                    "pages": results,
                    "preview_token": preview_token,
                }
            )

        rgb, (w, h) = decode_image_to_rgb_numpy(raw)
        if preprocess:
            rgb = preprocess_for_ocr(rgb, max_side=max_side, deskew=deskew)
        img_w, img_h = int(rgb.shape[1]), int(rgb.shape[0])
        r = await service.process_rgb_array(rgb)
        preview_token = None
        preview_url = None
        if return_images:
            preview_token = secrets.token_urlsafe(16)
            _preview_cache[preview_token] = {"created_at": now, "mime": "image", "image_bytes": raw}
            preview_url = f"/api/projects/{project_name}/ocr/preview?token={preview_token}&page=1&max_side={int(preview_max_side or 900)}"
        return JSONResponse(
            {
                "success": bool(r.get("success")),
                "technology": technology,
                "page": 1,
                "width": w,
                "height": h,
                "processed_width": img_w,
                "processed_height": img_h,
                "text": r.get("text", ""),
                "blocks": r.get("blocks", []),
                "preview_url": preview_url,
                "preview_token": preview_token,
            }
        )
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"OCR 依赖未安装: {e}")
    except Exception as e:
        logger.exception(f"OCR 识别失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
