"""
Pomodoro router - ポモドーロタイマー機能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from database import get_pomodoro_sessions_container, get_timers_container

router = APIRouter()

# Pydanticモデル
class PomodoroSessionCreate(BaseModel):
    timerId: str
    taskDescription: str  # 作業内容
    pomodoroCount: int = 4  # 連続ポモドーロ数（デフォルト4）

class PomodoroSessionUpdate(BaseModel):
    status: str  # 'in_progress', 'completed', 'interrupted'
    completedPomodoros: Optional[int] = None
    actualDuration: Optional[int] = None  # 実際の作業時間（秒）
    note: Optional[str] = None

class PomodoroSession(BaseModel):
    id: str
    timerId: str
    taskDescription: str
    pomodoroCount: int
    completedPomodoros: int
    status: str  # 'in_progress', 'completed', 'interrupted'
    startedAt: str
    completedAt: Optional[str] = None
    actualDuration: Optional[int] = None
    note: Optional[str] = None

class PomodoroStats(BaseModel):
    totalPomodoros: int
    totalDuration: int  # 分
    todayPomodoros: int
    weekPomodoros: int
    monthPomodoros: int
    taskBreakdown: List[dict]  # 作業内容別の集計

@router.post("/sessions")
async def create_pomodoro_session(session: PomodoroSessionCreate):
    """ポモドーロセッション開始"""
    try:
        container = get_pomodoro_sessions_container()
        
        new_session = {
            "id": str(uuid.uuid4()),
            "timerId": session.timerId,
            "taskDescription": session.taskDescription,
            "pomodoroCount": session.pomodoroCount,
            "completedPomodoros": 0,
            "status": "in_progress",
            "startedAt": datetime.utcnow().isoformat(),
            "completedAt": None,
            "actualDuration": None,
            "note": None
        }
        
        container.create_item(body=new_session)
        return {"data": new_session}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_pomodoro_sessions(
    timerId: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    """ポモドーロセッション一覧取得"""
    try:
        container = get_pomodoro_sessions_container()
        
        # クエリ構築
        query = "SELECT * FROM c WHERE 1=1"
        if timerId:
            query += f" AND c.timerId = '{timerId}'"
        if status:
            query += f" AND c.status = '{status}'"
        query += " ORDER BY c.startedAt DESC"
        
        sessions = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        return {"data": sessions[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}")
async def get_pomodoro_session(session_id: str):
    """ポモドーロセッション詳細取得"""
    try:
        container = get_pomodoro_sessions_container()
        session = container.read_item(item=session_id, partition_key=session_id)
        return {"data": session}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Session not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sessions/{session_id}")
async def update_pomodoro_session(session_id: str, update: PomodoroSessionUpdate):
    """ポモドーロセッション更新"""
    try:
        container = get_pomodoro_sessions_container()
        
        session = container.read_item(item=session_id, partition_key=session_id)
        
        # 更新
        session["status"] = update.status
        if update.completedPomodoros is not None:
            session["completedPomodoros"] = update.completedPomodoros
        if update.actualDuration is not None:
            session["actualDuration"] = update.actualDuration
        if update.note is not None:
            session["note"] = update.note
        
        # 完了時刻を記録
        if update.status in ["completed", "interrupted"]:
            session["completedAt"] = datetime.utcnow().isoformat()
        
        container.replace_item(item=session_id, body=session)
        return {"data": session}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Session not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_pomodoro_session(session_id: str):
    """ポモドーロセッション削除"""
    try:
        container = get_pomodoro_sessions_container()
        container.delete_item(item=session_id, partition_key=session_id)
        return {"message": "Session deleted successfully"}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Session not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_pomodoro_stats(timerId: Optional[str] = None):
    """ポモドーロ統計取得"""
    try:
        container = get_pomodoro_sessions_container()
        
        # 全セッション取得
        query = "SELECT * FROM c WHERE c.status = 'completed'"
        if timerId:
            query += f" AND c.timerId = '{timerId}'"
        
        sessions = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        # 統計計算
        from datetime import timedelta
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        total_pomodoros = sum(s.get("completedPomodoros", 0) for s in sessions)
        total_duration = sum(s.get("actualDuration", 0) for s in sessions) // 60  # 分に変換
        
        today_pomodoros = sum(
            s.get("completedPomodoros", 0) 
            for s in sessions 
            if datetime.fromisoformat(s["startedAt"]) >= today_start
        )
        
        week_pomodoros = sum(
            s.get("completedPomodoros", 0) 
            for s in sessions 
            if datetime.fromisoformat(s["startedAt"]) >= week_start
        )
        
        month_pomodoros = sum(
            s.get("completedPomodoros", 0) 
            for s in sessions 
            if datetime.fromisoformat(s["startedAt"]) >= month_start
        )
        
        # 作業内容別集計
        task_breakdown = {}
        for s in sessions:
            task = s.get("taskDescription", "不明")
            if task not in task_breakdown:
                task_breakdown[task] = {
                    "task": task,
                    "pomodoros": 0,
                    "duration": 0
                }
            task_breakdown[task]["pomodoros"] += s.get("completedPomodoros", 0)
            task_breakdown[task]["duration"] += s.get("actualDuration", 0) // 60
        
        return {
            "data": {
                "totalPomodoros": total_pomodoros,
                "totalDuration": total_duration,
                "todayPomodoros": today_pomodoros,
                "weekPomodoros": week_pomodoros,
                "monthPomodoros": month_pomodoros,
                "taskBreakdown": list(task_breakdown.values())
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/timers/{timer_id}/pomodoro")
async def create_pomodoro_timer(timer_id: str):
    """既存タイマーをポモドーロモードに設定"""
    try:
        timers_container = get_timers_container()
        
        timer = timers_container.read_item(item=timer_id, partition_key=timer_id)
        timer["isPomodoroMode"] = True
        timer["pomodoroSettings"] = {
            "workDuration": 25,  # 分
            "shortBreak": 5,
            "longBreak": 15,
            "sessionsUntilLongBreak": 4
        }
        
        timers_container.replace_item(item=timer_id, body=timer)
        return {"data": timer}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Timer not found")
        raise HTTPException(status_code=500, detail=str(e))
