from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from azure.cosmos import exceptions
from database import timers_container, tags_container, records_container
import time

router = APIRouter()

class TimerRecord(BaseModel):
    startTime: datetime
    endTime: datetime
    duration: int  # 秒単位
    tag: Optional[str] = None
    date: str  # YYYY-MM-DD形式

class Timer(BaseModel):
    id: Optional[str] = None
    name: str
    duration: int  # 秒単位
    image: Optional[str] = None
    type: Optional[str] = "countdown"  # "countdown" or "stopwatch"
    order: Optional[int] = 0
    isFavorite: Optional[bool] = False

class TimerCreate(BaseModel):
    name: str
    duration: int
    image: Optional[str] = None
    type: Optional[str] = "countdown"
    order: Optional[int] = 0
    isFavorite: Optional[bool] = False

# ストップウォッチの固定ID
STOPWATCH_ID = "stopwatch-fixed"

# アクティブなタイマーの開始時刻を保存（インメモリ）
active_timers: dict = {}

@router.get("/")
async def get_timers():
    """タイマー一覧取得"""
    try:
        # すべてのタイマーを取得（ORDER BYは使わない）
        query = "SELECT * FROM c"
        items = list(timers_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        # orderフィールドでソート（ない場合は0として扱う）
        items.sort(key=lambda x: x.get('order', 0))
        return items
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timers: {e.message}")

@router.post("/")
async def create_timer(timer: TimerCreate):
    """タイマー作成"""
    try:
        # 一意なIDを生成（タイムスタンプベース）
        timer_id = f"timer-{int(datetime.now().timestamp() * 1000)}"
        
        # 現在の最大order値を取得（すべてのタイマーを取得してPython側で計算）
        all_timers = list(timers_container.query_items(
            query="SELECT * FROM c",
            enable_cross_partition_query=True
        ))
        max_order = max([t.get('order', 0) for t in all_timers], default=-1)
        
        new_timer = {
            "id": timer_id,
            "name": timer.name,
            "duration": timer.duration,
            "image": timer.image,
            "type": timer.type or "countdown",
            "order": timer.order if timer.order is not None else max_order + 1,
            "isFavorite": timer.isFavorite or False
        }
        
        created_item = timers_container.create_item(body=new_timer)
        return created_item
    except exceptions.CosmosHttpResponseError as e:
        print(f"❌ Cosmos DB Error: {e.message}")
        print(f"❌ Status code: {e.status_code}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create timer: {e.message}")
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.post("/{timer_id}/start")
async def start_timer(timer_id: str):
    """タイマー開始"""
    try:
        timer = timers_container.read_item(item=timer_id, partition_key=timer_id)
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Timer not found")
    
    start_time = datetime.now()
    active_timers[timer_id] = start_time
    
    return {"message": "Timer started", "timer_id": timer_id, "startTime": start_time}

@router.post("/{timer_id}/stop")
async def stop_timer(timer_id: str, tag: Optional[str] = None, stamp: Optional[str] = None, comment: Optional[str] = None):
    """タイマー停止と記録保存"""
    try:
        timer = timers_container.read_item(item=timer_id, partition_key=timer_id)
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Timer not found")
    
    if timer_id not in active_timers:
        raise HTTPException(status_code=400, detail="Timer is not running")
    
    end_time = datetime.now()
    start_time = active_timers.pop(timer_id)
    
    # 期間を計算（秒）
    duration_seconds = int((end_time - start_time).total_seconds())
    
    # tagがNoneの場合は記録しない（キャンセル）
    if tag is not None:
        # 記録をrecordsコンテナに保存
        record_id = f"record-{int(time.time() * 1000)}"
        record = {
            "id": record_id,
            "timerId": timer_id,
            "timerName": timer.get("name"),
            "startTime": start_time.isoformat(),
            "endTime": end_time.isoformat(),
            "duration": duration_seconds,
            "tag": tag if tag else None,  # 空文字列はNoneに
            "stamp": stamp if stamp else None,  # スタンプを追加
            "comment": comment if comment else None,  # コメントを追加
            "date": start_time.strftime("%Y-%m-%d")
        }
        
        # Cosmos DBのrecordsコンテナに保存
        records_container.create_item(body=record)
    
    return {
        "message": "Timer stopped" + (" and saved" if tag is not None else " without saving"),
        "timer_id": timer_id,
        "endTime": end_time,
        "duration": duration_seconds,
        "saved": tag is not None
    }

@router.get("/{timer_id}/records")
async def get_timer_records(timer_id: str):
    """特定のタイマーの記録取得（recordsコンテナから）"""
    try:
        # recordsコンテナから該当タイマーの記録を取得
        query = f"SELECT * FROM c WHERE c.timerId = '{timer_id}' ORDER BY c.startTime DESC"
        records = list(records_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        return records
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch records: {e.message}")

@router.delete("/{timer_id}")
async def delete_timer(timer_id: str):
    """タイマー削除"""
    # ストップウォッチは削除不可
    if timer_id == STOPWATCH_ID:
        raise HTTPException(status_code=400, detail="Cannot delete stopwatch")
    
    # アクティブな場合は削除できない
    if timer_id in active_timers:
        raise HTTPException(status_code=400, detail="Cannot delete running timer")
    
    try:
        timers_container.delete_item(item=timer_id, partition_key=timer_id)
        return {"message": "Timer deleted", "timer_id": timer_id}
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Timer not found")

@router.get("/tags/all")
async def get_all_tags():
    """登録済みタグ一覧取得"""
    try:
        # タグコンテナから全タグを取得
        query = "SELECT c.name FROM c"
        items = list(tags_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        tags = [item["name"] for item in items]
        return {"tags": tags}
    except exceptions.CosmosHttpResponseError as e:
        return {"tags": []}

@router.post("/tags")
async def add_tag(tag: str):
    """新しいタグを追加"""
    if not tag:
        return {"message": "Invalid tag", "tag": tag}
    
    try:
        # タグが既に存在するか確認
        query = f"SELECT * FROM c WHERE c.name = '{tag}'"
        existing = list(tags_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        if existing:
            return {"message": "Tag already exists", "tag": tag}
        
        # 新しいタグを追加
        tag_id = f"tag-{int(datetime.now().timestamp() * 1000)}"
        new_tag = {
            "id": tag_id,
            "name": tag
        }
        tags_container.create_item(body=new_tag)
        return {"message": "Tag added", "tag": tag}
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to add tag: {e.message}")

class TimerUpdate(BaseModel):
    name: Optional[str] = None
    duration: Optional[int] = None
    image: Optional[str] = None

@router.put("/{timer_id}")
async def update_timer(timer_id: str, update: TimerUpdate):
    """タイマー更新"""
    try:
        timer = timers_container.read_item(item=timer_id, partition_key=timer_id)
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Timer not found")
    
    # ストップウォッチは画像のみ変更可能
    if timer.get("type") == "stopwatch":
        if update.image is not None:
            timer["image"] = update.image
    else:
        # カウントダウンは全て変更可能
        if update.name is not None:
            timer["name"] = update.name
        if update.duration is not None:
            timer["duration"] = update.duration
        if update.image is not None:
            timer["image"] = update.image
    
    # Cosmos DBを更新
    updated_timer = timers_container.upsert_item(body=timer)
    return updated_timer

class TimerReorder(BaseModel):
    timerIds: List[str]

@router.post("/reorder")
async def reorder_timers(reorder: TimerReorder):
    """タイマーの並び順を更新"""
    try:
        # 各タイマーのorderを更新
        for index, timer_id in enumerate(reorder.timerIds):
            try:
                timer = timers_container.read_item(item=timer_id, partition_key=timer_id)
                timer["order"] = index
                timers_container.upsert_item(body=timer)
            except exceptions.CosmosResourceNotFoundError:
                continue
        
        return {"message": "Timers reordered successfully"}
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to reorder timers: {e.message}")

@router.put("/{timer_id}/favorite")
async def toggle_favorite(timer_id: str):
    """タイマーのお気に入り状態を切り替え"""
    try:
        timer = timers_container.read_item(item=timer_id, partition_key=timer_id)
        timer["isFavorite"] = not timer.get("isFavorite", False)
        updated_timer = timers_container.upsert_item(body=timer)
        return updated_timer
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Timer not found")
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle favorite: {e.message}")
