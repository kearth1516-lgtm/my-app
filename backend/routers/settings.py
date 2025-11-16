from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from azure.cosmos import exceptions
from database import settings_container

router = APIRouter()

class Settings(BaseModel):
    theme: str = "purple"  # purple, blue, green, pink, orange
    soundEnabled: Optional[bool] = True
    soundVolume: Optional[float] = 0.5  # 0.0 - 1.0
    soundType: Optional[str] = "beep"  # beep, bell, chime, digital
    openaiApiKey: Optional[str] = None  # OpenAI API Key
    googleCalendarId: Optional[str] = None  # Google Calendar ID
    weatherApiKey: Optional[str] = None  # Weather API Key (OpenWeatherMap)

# 設定のID（固定）
SETTINGS_ID = "app-settings"

@router.get("/")
async def get_settings():
    """設定取得"""
    try:
        settings = settings_container.read_item(item=SETTINGS_ID, partition_key=SETTINGS_ID)
        return {
            "theme": settings.get("theme", "purple"),
            "soundEnabled": settings.get("soundEnabled", True),
            "soundVolume": settings.get("soundVolume", 0.5),
            "soundType": settings.get("soundType", "beep"),
            "openaiApiKey": settings.get("openaiApiKey", ""),
            "googleCalendarId": settings.get("googleCalendarId", ""),
            "weatherApiKey": settings.get("weatherApiKey", "")
        }
    except exceptions.CosmosResourceNotFoundError:
        # 設定が存在しない場合はデフォルト値を返す
        return {
            "theme": "purple",
            "soundEnabled": True,
            "soundVolume": 0.5,
            "soundType": "beep",
            "openaiApiKey": "",
            "googleCalendarId": "",
            "weatherApiKey": ""
        }

@router.put("/")
async def update_settings(settings: Settings):
    """設定更新"""
    try:
        # 既存の設定を取得
        existing_settings = settings_container.read_item(item=SETTINGS_ID, partition_key=SETTINGS_ID)
        existing_settings["theme"] = settings.theme
        if settings.soundEnabled is not None:
            existing_settings["soundEnabled"] = settings.soundEnabled
        if settings.soundVolume is not None:
            existing_settings["soundVolume"] = settings.soundVolume
        if settings.soundType is not None:
            existing_settings["soundType"] = settings.soundType
        if settings.openaiApiKey is not None:
            existing_settings["openaiApiKey"] = settings.openaiApiKey
        if settings.googleCalendarId is not None:
            existing_settings["googleCalendarId"] = settings.googleCalendarId
        if settings.weatherApiKey is not None:
            existing_settings["weatherApiKey"] = settings.weatherApiKey
        updated_settings = settings_container.upsert_item(body=existing_settings)
        return {
            "theme": updated_settings.get("theme"),
            "soundEnabled": updated_settings.get("soundEnabled", True),
            "soundVolume": updated_settings.get("soundVolume", 0.5),
            "soundType": updated_settings.get("soundType", "beep"),
            "openaiApiKey": updated_settings.get("openaiApiKey", ""),
            "googleCalendarId": updated_settings.get("googleCalendarId", ""),
            "weatherApiKey": updated_settings.get("weatherApiKey", "")
        }
    except exceptions.CosmosResourceNotFoundError:
        # 設定が存在しない場合は新規作成
        new_settings = {
            "id": SETTINGS_ID,
            "theme": settings.theme,
            "soundEnabled": settings.soundEnabled if settings.soundEnabled is not None else True,
            "soundVolume": settings.soundVolume if settings.soundVolume is not None else 0.5,
            "soundType": settings.soundType if settings.soundType is not None else "beep",
            "openaiApiKey": settings.openaiApiKey if settings.openaiApiKey is not None else "",
            "googleCalendarId": settings.googleCalendarId if settings.googleCalendarId is not None else "",
            "weatherApiKey": settings.weatherApiKey if settings.weatherApiKey is not None else ""
        }
        created_settings = settings_container.create_item(body=new_settings)
        return {
            "theme": created_settings.get("theme"),
            "soundEnabled": created_settings.get("soundEnabled", True),
            "soundVolume": created_settings.get("soundVolume", 0.5),
            "soundType": created_settings.get("soundType", "beep"),
            "openaiApiKey": created_settings.get("openaiApiKey", ""),
            "googleCalendarId": created_settings.get("googleCalendarId", ""),
            "weatherApiKey": created_settings.get("weatherApiKey", "")
        }
