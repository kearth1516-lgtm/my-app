from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import random

router = APIRouter()

class HomeImage(BaseModel):
    id: Optional[str] = None
    imageUrl: str
    caption: Optional[str] = None

@router.get("/images")
async def get_random_image():
    """ランダム推し写真取得"""
    # TODO: 実装（データベースからランダムに取得）
    return {
        "id": "img-001",
        "imageUrl": "/images/mogu.jpg",
        "caption": "推し"
    }

@router.post("/images")
async def upload_image(image: HomeImage):
    """推し写真登録"""
    # TODO: 実装
    return {"id": "img-002", **image.dict()}
