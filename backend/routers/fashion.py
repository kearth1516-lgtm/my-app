from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

router = APIRouter()

class FashionItem(BaseModel):
    id: Optional[str] = None
    imageUrl: str
    category: str  # top, bottom, shoes, etc.
    color: str

class DailyOutfit(BaseModel):
    id: Optional[str] = None
    date: date
    items: List[str]  # item IDs
    weather: Optional[str] = None

@router.get("/items")
async def get_fashion_items():
    """ファッションアイテム一覧取得"""
    # TODO: 実装
    return []

@router.post("/items")
async def create_fashion_item(item: FashionItem):
    """ファッションアイテム登録"""
    # TODO: 実装
    return {"id": "item-001", **item.dict()}

@router.get("/outfits")
async def get_outfits():
    """コーディネート履歴取得"""
    # TODO: 実装
    return []

@router.post("/outfits")
async def create_outfit(outfit: DailyOutfit):
    """コーディネート記録"""
    # TODO: 実装
    return {"id": "outfit-001", **outfit.dict()}
