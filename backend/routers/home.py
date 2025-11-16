from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import random
import os
import requests
from database import settings_container
from azure.cosmos import exceptions as cosmos_exceptions

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

@router.get("/weather")
async def get_weather():
    """天気情報取得"""
    try:
        # 設定からAPIキーを取得
        try:
            settings = settings_container.read_item(item="app-settings", partition_key="app-settings")
            api_key = settings.get("weatherApiKey")
        except cosmos_exceptions.CosmosResourceNotFoundError:
            api_key = None
        
        # 環境変数からもフォールバック
        if not api_key:
            api_key = os.getenv("WEATHER_API_KEY")
        
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="天気情報を取得できません（APIキーが設定されていません）"
            )
        
        # OpenWeatherMap API (東京の天気)
        # TODO: 位置情報をユーザー設定から取得
        city = "Tokyo"
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang=ja"
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        return {
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "humidity": data["main"]["humidity"],
            "windSpeed": data["wind"]["speed"]
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"天気情報の取得に失敗しました: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CalendarEvent(BaseModel):
    id: str
    summary: str
    start: str
    end: str
    description: Optional[str] = None

@router.get("/calendar/events")
async def get_calendar_events():
    """Googleカレンダーのイベント取得（今日・明日・明後日）"""
    try:
        # 設定からカレンダーIDを取得
        try:
            settings = settings_container.read_item(item="app-settings", partition_key="app-settings")
            calendar_id = settings.get("googleCalendarId")
        except cosmos_exceptions.CosmosResourceNotFoundError:
            calendar_id = None
        
        if not calendar_id:
            # カレンダーIDが設定されていない場合は空配列を返す
            return {"events": []}
        
        # TODO: Google Calendar API連携実装
        # 現在はモックデータを返す
        now = datetime.now()
        mock_events = [
            {
                "id": "event1",
                "summary": "朝のミーティング",
                "start": now.replace(hour=9, minute=0).isoformat(),
                "end": now.replace(hour=10, minute=0).isoformat(),
                "description": "週次ミーティング"
            },
            {
                "id": "event2",
                "summary": "ランチ",
                "start": now.replace(hour=12, minute=0).isoformat(),
                "end": now.replace(hour=13, minute=0).isoformat(),
                "description": None
            },
            {
                "id": "event3",
                "summary": "プロジェクトレビュー",
                "start": (now + timedelta(days=1)).replace(hour=14, minute=0).isoformat(),
                "end": (now + timedelta(days=1)).replace(hour=15, minute=30).isoformat(),
                "description": "Q4プロジェクトの進捗確認"
            }
        ]
        
        return {"events": mock_events}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
