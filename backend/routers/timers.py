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

@router.get("/")
async def get_timers():
    """タイマー一覧取得"""
    # TODO: 実装
    return []

@router.post("/")
async def create_timer(timer: Timer):
    """タイマー作成"""
    # TODO: 実装
    return {"id": "timer-001", **timer.dict()}

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
