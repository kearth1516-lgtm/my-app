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
        print("[DEBUG] Starting weather API request")
        
        # 設定からAPIキーを取得
        api_key = None
        try:
            settings = settings_container.read_item(item="app-settings", partition_key="app-settings")
            api_key = settings.get("weatherApiKey")
            print(f"[DEBUG] API key from settings: {'set' if api_key else 'not set'}")
        except cosmos_exceptions.CosmosResourceNotFoundError:
            print("[DEBUG] Settings not found in database")
        except Exception as e:
            print(f"[DEBUG] Error reading settings: {e}")
            import traceback
            traceback.print_exc()
        
        # 環境変数からもフォールバック
        if not api_key:
            api_key = os.getenv("WEATHER_API_KEY")
            print(f"[DEBUG] API key from env: {'set' if api_key else 'not set'}")
        
        if not api_key:
            print("[DEBUG] No API key found, returning null data")
            # APIキーが設定されていない場合はnullを返す（エラーにしない）
            return {
                "temperature": None,
                "description": None,
                "icon": None,
                "humidity": None,
                "windSpeed": None,
                "error": "APIキーが設定されていません"
            }
        
        # OpenWeatherMap API (東京の天気)
        city = "Tokyo"
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang=ja"
        print(f"[DEBUG] Requesting weather from OpenWeatherMap")
        
        response = requests.get(url, timeout=10)
        print(f"[DEBUG] Response status: {response.status_code}")
        response.raise_for_status()
        data = response.json()
        print("[DEBUG] Weather data retrieved successfully")
        
        return {
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "humidity": data["main"]["humidity"],
            "windSpeed": data["wind"]["speed"]
        }
        
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Request exception: {e}")
        return {
            "temperature": None,
            "description": None,
            "icon": None,
            "humidity": None,
            "windSpeed": None,
            "error": f"天気情報の取得に失敗しました: {str(e)}"
        }
    except Exception as e:
        print(f"[ERROR] Unexpected exception: {e}")
        import traceback
        traceback.print_exc()
        return {
            "temperature": None,
            "description": None,
            "icon": None,
            "humidity": None,
            "windSpeed": None,
            "error": str(e)
        }

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
