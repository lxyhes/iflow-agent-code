from __future__ import annotations

import io
from typing import Any, List, Optional, Tuple


def decode_image_to_rgb_numpy(image_bytes: bytes):
    from PIL import Image as PILImage
    import numpy as np

    pil = PILImage.open(io.BytesIO(image_bytes))
    if pil.mode != "RGB":
        pil = pil.convert("RGB")
    return np.array(pil), pil.size


def _resize_max_side(rgb: Any, max_side: int):
    import numpy as np

    h, w = rgb.shape[:2]
    m = max(h, w)
    if max_side and m > max_side:
        scale = float(max_side) / float(m)
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        try:
            import cv2

            resized = cv2.resize(rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
            return resized
        except Exception:
            from PIL import Image as PILImage

            pil = PILImage.fromarray(rgb)
            pil = pil.resize((new_w, new_h), PILImage.Resampling.LANCZOS)
            return np.array(pil)
    return rgb


def preprocess_for_ocr(rgb: Any, max_side: int = 2200, deskew: bool = True):
    rgb = _resize_max_side(rgb, max_side=max_side)
    try:
        import cv2
        import numpy as np

        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
        if deskew:
            _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            bw = 255 - bw
            coords = np.column_stack(np.where(bw > 0))
            if coords.size > 0:
                rect = cv2.minAreaRect(coords)
                angle = rect[-1]
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                if abs(angle) >= 0.8:
                    h, w = gray.shape[:2]
                    m = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
                    gray = cv2.warpAffine(gray, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        rgb2 = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
        return rgb2
    except Exception:
        return rgb


def render_pdf_pages(
    pdf_bytes: bytes,
    dpi: int = 200,
    page_indices: Optional[List[int]] = None,
) -> List[Tuple[int, Any]]:
    import pypdfium2 as pdfium
    import numpy as np

    dpi = int(dpi or 200)
    dpi = max(120, min(350, dpi))
    scale = dpi / 72.0

    doc = pdfium.PdfDocument(pdf_bytes)
    total = len(doc)
    if page_indices:
        indices = [i for i in page_indices if 0 <= i < total]
    else:
        indices = list(range(total))

    pages: List[Tuple[int, Any]] = []
    for i in indices:
        page = doc[i]
        pil = page.render(scale=scale).to_pil()
        if pil.mode != "RGB":
            pil = pil.convert("RGB")
        pages.append((i, np.array(pil)))
    return pages

