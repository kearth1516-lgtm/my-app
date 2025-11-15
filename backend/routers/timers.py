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
# アクティブなタイマーの開始時刻を保存
active_timers: dict = {}

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
    timer = next((t for t in timers_storage if t["id"] == timer_id), None)
    if not timer:
        raise HTTPException(status_code=404, detail="Timer not found")
    
    start_time = datetime.now()
    active_timers[timer_id] = start_time
    
    return {"message": "Timer started", "timer_id": timer_id, "startTime": start_time}

@router.post("/{timer_id}/stop")
async def stop_timer(timer_id: str):
    """タイマー停止"""
    timer = next((t for t in timers_storage if t["id"] == timer_id), None)
    if not timer:
        raise HTTPException(status_code=404, detail="Timer not found")
    
    if timer_id not in active_timers:
        raise HTTPException(status_code=400, detail="Timer is not running")
    
    end_time = datetime.now()
    start_time = active_timers.pop(timer_id)
    
    # 記録を追加
    record = {
        "startTime": start_time.isoformat(),
        "endTime": end_time.isoformat()
    }
    timer["records"].append(record)
    
    return {"message": "Timer stopped", "timer_id": timer_id, "endTime": end_time, "record": record}

@router.get("/{timer_id}/records")
async def get_timer_records(timer_id: str):
    """タイマー記録取得"""
    timer = next((t for t in timers_storage if t["id"] == timer_id), None)
    if not timer:
        raise HTTPException(status_code=404, detail="Timer not found")
    
    return timer["records"]

@router.delete("/{timer_id}")
async def delete_timer(timer_id: str):
    """タイマー削除"""
    global timers_storage
    
    timer = next((t for t in timers_storage if t["id"] == timer_id), None)
    if not timer:
        raise HTTPException(status_code=404, detail="Timer not found")
    
    # アクティブな場合は削除できない
    if timer_id in active_timers:
        raise HTTPException(status_code=400, detail="Cannot delete running timer")
    
    timers_storage = [t for t in timers_storage if t["id"] != timer_id]
    
    return {"message": "Timer deleted", "timer_id": timer_id}
