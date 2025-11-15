from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class TimerRecord(BaseModel):
    startTime: datetime
    endTime: datetime

class Timer(BaseModel):
    id: Optional[str] = None
    name: str
    duration: int  # 秒単位
    imageUrl: Optional[str] = None
    records: List[TimerRecord] = []

class TimerCreate(BaseModel):
    name: str
    duration: int
    imageUrl: Optional[str] = None

# インメモリストレージ（実装用）
timers_storage: List[dict] = [
    {
        "id": "timer-001",
        "name": "勉強タイマー",
        "duration": 3600,  # 1時間
        "imageUrl": "/images/mogu.jpg",
        "records": []
    },
    {
        "id": "timer-002",
        "name": "休憩タイマー",
        "duration": 300,  # 5分
        "imageUrl": "/images/mogu.jpg",
        "records": []
    }
]
next_timer_id = 3

@router.get("/")
async def get_timers():
    """タイマー一覧取得"""
    return timers_storage

@router.post("/")
async def create_timer(timer: TimerCreate):
    """タイマー作成"""
    global next_timer_id
    
    new_timer = {
        "id": f"timer-{str(next_timer_id).zfill(3)}",
        "name": timer.name,
        "duration": timer.duration,
        "imageUrl": timer.imageUrl or "/images/mogu.jpg",
        "records": []
    }
    
    timers_storage.append(new_timer)
    next_timer_id += 1
    
    return new_timer

@router.post("/{timer_id}/start")
async def start_timer(timer_id: str):
    """タイマー開始"""
    # TODO: 実装
    return {"message": "Timer started", "timer_id": timer_id, "startTime": datetime.now()}

@router.post("/{timer_id}/stop")
async def stop_timer(timer_id: str):
    """タイマー停止"""
    # TODO: 実装
    return {"message": "Timer stopped", "timer_id": timer_id, "endTime": datetime.now()}

@router.get("/{timer_id}/records")
async def get_timer_records(timer_id: str):
    """タイマー記録取得"""
    # TODO: 実装
    return []
