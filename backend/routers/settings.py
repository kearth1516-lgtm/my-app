from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from azure.cosmos import exceptions
from database import settings_container

router = APIRouter()

class Settings(BaseModel):
    theme: str = "purple"  # purple, blue, green, pink, orange

# 設定のID（固定）
SETTINGS_ID = "app-settings"

@router.get("/")
async def get_settings():
    """設定取得"""
    try:
        settings = settings_container.read_item(item=SETTINGS_ID, partition_key=SETTINGS_ID)
        return {"theme": settings.get("theme", "purple")}
    except exceptions.CosmosResourceNotFoundError:
        # 設定が存在しない場合はデフォルト値を返す
        return {"theme": "purple"}

@router.put("/")
async def update_settings(settings: Settings):
    """設定更新"""
    try:
        # 既存の設定を取得
        existing_settings = settings_container.read_item(item=SETTINGS_ID, partition_key=SETTINGS_ID)
        existing_settings["theme"] = settings.theme
        updated_settings = settings_container.upsert_item(body=existing_settings)
        return {"theme": updated_settings.get("theme")}
    except exceptions.CosmosResourceNotFoundError:
        # 設定が存在しない場合は新規作成
        new_settings = {
            "id": SETTINGS_ID,
            "theme": settings.theme
        }
        created_settings = settings_container.create_item(body=new_settings)
        return {"theme": created_settings.get("theme")}
