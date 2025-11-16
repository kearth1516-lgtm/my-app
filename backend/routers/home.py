from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import random
import os
import requests
from database import settings_container
from azure.cosmos import exceptions as cosmos_exceptions
from googleapiclient.discovery import build
from google.oauth2 import service_account

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
    """天気情報取得（Open-Meteo API - 完全無料、APIキー不要）"""
    try:
        print("[DEBUG] Starting weather API request")
        
        # Open-Meteo API（東京の座標）
        # 完全無料、APIキー不要、クレジットカード不要
        latitude = 35.6762  # 東京の緯度
        longitude = 139.6503  # 東京の経度
        
        url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current_weather=true&timezone=Asia/Tokyo"
        print(f"[DEBUG] Requesting weather from Open-Meteo (free, no API key)")
        
        response = requests.get(url, timeout=10)
        print(f"[DEBUG] Response status: {response.status_code}")
        response.raise_for_status()
        data = response.json()
        print("[DEBUG] Weather data retrieved successfully")
        
        current_weather = data["current_weather"]
        
        # WMO Weather interpretation codes を日本語に変換
        weather_codes = {
            0: "快晴",
            1: "晴れ",
            2: "一部曇り",
            3: "曇り",
            45: "霧",
            48: "霧氷",
            51: "小雨",
            53: "雨",
            55: "大雨",
            61: "小雨",
            63: "雨",
            65: "大雨",
            71: "小雪",
            73: "雪",
            75: "大雪",
            77: "みぞれ",
            80: "にわか雨",
            81: "にわか雨",
            82: "強いにわか雨",
            85: "にわか雪",
            86: "強いにわか雪",
            95: "雷雨",
            96: "雹を伴う雷雨",
            99: "雹を伴う雷雨"
        }
        
        weather_code = current_weather["weathercode"]
        description = weather_codes.get(weather_code, "不明")
        
        # アイコンコードを生成（簡易版）
        # 0: 快晴, 1-3: 晴れ/曇り, 45-48: 霧, 51-67: 雨, 71-77: 雪, 80-99: 雷雨
        if weather_code == 0:
            icon = "01d"  # 快晴
        elif weather_code in [1, 2]:
            icon = "02d"  # 晴れ
        elif weather_code == 3:
            icon = "03d"  # 曇り
        elif weather_code in [45, 48]:
            icon = "50d"  # 霧
        elif weather_code in range(51, 68):
            icon = "10d"  # 雨
        elif weather_code in range(71, 78):
            icon = "13d"  # 雪
        else:
            icon = "11d"  # 雷雨
        
        return {
            "temperature": current_weather["temperature"],
            "description": description,
            "icon": icon,
            "humidity": None,  # Open-Meteoの無料版では湿度は別途取得が必要
            "windSpeed": current_weather["windspeed"]
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
        # 設定からカレンダーURLを取得
        try:
            settings = settings_container.read_item(item="app-settings", partition_key="app-settings")
            calendar_url = settings.get("googleCalendarId")
        except cosmos_exceptions.CosmosResourceNotFoundError:
            calendar_url = None
        
        if not calendar_url:
            # カレンダーURLが設定されていない場合は空配列を返す
            return {"events": []}
        
        print(f"[DEBUG] Calendar URL from settings: {calendar_url}")
        
        # 共有可能なリンクから取得
        try:
            # calendar_urlが共有リンクの場合 (https://calendar.google.com/calendar/embed?src=...)
            # または iCal URL (https://calendar.google.com/calendar/ical/.../basic.ics)
            # または単純なID (example@gmail.com)
            
            ical_url = None
            
            if "calendar.google.com/calendar/ical/" in calendar_url and calendar_url.endswith(".ics"):
                # すでにiCal URL形式
                ical_url = calendar_url
            elif "cid=" in calendar_url:
                # カレンダーURLからcidパラメータを抽出
                # 例: https://calendar.google.com/calendar/u/1?cid=a2VhcnRoMTUxNkBnbWFpbC5jb20
                import re
                from urllib.parse import unquote
                import base64
                
                cid_match = re.search(r'cid=([^&]+)', calendar_url)
                if cid_match:
                    cid = cid_match.group(1)
                    # cidはbase64エンコードされている可能性がある
                    try:
                        # URL-safeなbase64デコードを試す
                        decoded = base64.b64decode(cid + '==').decode('utf-8')
                        calendar_id = decoded
                        print(f"[DEBUG] Decoded calendar ID from cid: {calendar_id}")
                    except:
                        # デコード失敗した場合はそのまま使用
                        calendar_id = unquote(cid)
                        print(f"[DEBUG] Using cid as-is: {calendar_id}")
                    
                    # 秘密のアドレスを試す（通常はこれで取得できる）
                    ical_url = f"https://calendar.google.com/calendar/ical/{calendar_id}/private/basic.ics"
                else:
                    print("[ERROR] Could not extract cid from URL")
                    return {"events": []}
            elif "calendar.google.com/calendar/embed?" in calendar_url or "calendar.google.com/calendar/u/" in calendar_url:
                # 共有リンクからsrcパラメータを抽出
                import re
                from urllib.parse import unquote
                src_match = re.search(r'src=([^&]+)', calendar_url)
                if src_match:
                    calendar_id = unquote(src_match.group(1))
                    # 秘密のアドレス（private URL）形式に対応
                    # 例: https://calendar.google.com/calendar/ical/{calendar_id}/private-{secret_key}/basic.ics
                    if "/private-" in calendar_url or "ctz=" in calendar_url:
                        # 秘密のアドレスは直接使用
                        # 共有リンクのcidパラメータから秘密のURLを構築
                        cid_match = re.search(r'cid=([^&]+)', calendar_url)
                        if cid_match:
                            ical_url = f"https://calendar.google.com/calendar/ical/{calendar_id}/private-{cid_match.group(1)}/basic.ics"
                        else:
                            # 公開URL形式を試す
                            ical_url = f"https://calendar.google.com/calendar/ical/{calendar_id}/public/basic.ics"
                    else:
                        ical_url = f"https://calendar.google.com/calendar/ical/{calendar_id}/public/basic.ics"
                else:
                    print("[ERROR] Could not extract calendar ID from URL")
                    return {"events": []}
            elif "@" in calendar_url and not calendar_url.startswith("http"):
                # メールアドレス形式のID
                ical_url = f"https://calendar.google.com/calendar/ical/{calendar_url}/public/basic.ics"
            else:
                print(f"[ERROR] Invalid calendar URL format: {calendar_url}")
                return {"events": []}
            
            print(f"[DEBUG] Fetching calendar from: {ical_url}")
            response = requests.get(ical_url, timeout=10)
            
            if response.status_code == 404:
                print("[WARNING] Calendar not found or not accessible. Returning empty events.")
                print("[INFO] Please check: 1) Calendar sharing settings, 2) URL is correct")
                return {"events": []}
            
            response.raise_for_status()
            
            # iCalデータをパース
            import re
            from datetime import datetime as dt
            
            ical_data = response.text
            events = []
            
            # VEVENTブロックを抽出
            event_blocks = re.findall(r'BEGIN:VEVENT.*?END:VEVENT', ical_data, re.DOTALL)
            
            now = datetime.utcnow()
            
            for block in event_blocks:
                # 必要な情報を抽出
                summary_match = re.search(r'SUMMARY:(.*)', block)
                dtstart_match = re.search(r'DTSTART(?:;[^:]*)?:(.*)', block)
                dtend_match = re.search(r'DTEND(?:;[^:]*)?:(.*)', block)
                uid_match = re.search(r'UID:(.*)', block)
                description_match = re.search(r'DESCRIPTION:(.*)', block)
                
                if summary_match and dtstart_match and dtend_match:
                    summary = summary_match.group(1).strip()
                    dtstart = dtstart_match.group(1).strip()
                    dtend = dtend_match.group(1).strip()
                    uid = uid_match.group(1).strip() if uid_match else f"event-{len(events)}"
                    description = description_match.group(1).strip() if description_match else None
                    
                    # 日時をISO形式に変換
                    try:
                        # iCal形式: 20231116T090000Z または 20231116
                        if 'T' in dtstart:
                            start_dt = dt.strptime(dtstart.replace('Z', ''), '%Y%m%dT%H%M%S')
                            end_dt = dt.strptime(dtend.replace('Z', ''), '%Y%m%dT%H%M%S')
                        else:
                            # 終日イベント
                            start_dt = dt.strptime(dtstart, '%Y%m%d')
                            end_dt = dt.strptime(dtend, '%Y%m%d')
                        
                        # 今日から3日以内のイベントのみ
                        if start_dt >= now.replace(hour=0, minute=0, second=0, microsecond=0) and start_dt < now + timedelta(days=3):
                            events.append({
                                "id": uid,
                                "summary": summary,
                                "start": start_dt.isoformat(),
                                "end": end_dt.isoformat(),
                                "description": description
                            })
                    except ValueError as e:
                        print(f"[WARNING] Failed to parse date: {e}")
                        continue
            
            # 開始時刻でソート
            events.sort(key=lambda x: x['start'])
            
            print(f"[DEBUG] Found {len(events)} events")
            return {"events": events}
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to fetch calendar: {e}")
            return {"events": []}
        
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
