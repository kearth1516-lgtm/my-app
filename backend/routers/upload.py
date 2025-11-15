from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
import uuid

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """画像をアップロード"""
    
    # ファイル拡張子チェック
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"許可されていないファイル形式です。{', '.join(ALLOWED_EXTENSIONS)}のみアップロード可能です。"
        )
    
    # ファイルサイズチェック
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"ファイルサイズが大きすぎます。最大{MAX_FILE_SIZE // (1024*1024)}MBまでです。"
        )
    
    # ユニークなファイル名を生成
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # ファイルを保存
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    
    # アクセス可能なURLを返す
    file_url = f"/uploads/{unique_filename}"
    
    return {
        "filename": unique_filename,
        "url": file_url,
        "size": len(contents)
    }
