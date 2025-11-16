"""
Records router - 全体の記録を管理するAPI
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import time
from database import records_container
from azure.cosmos import exceptions

router = APIRouter(prefix="/api/records", tags=["records"])


class RecordCreate(BaseModel):
    timerId: str
    timerName: str
    startTime: str
    endTime: str
    duration: int
    date: str
    tag: Optional[str] = None


class ManualRecordCreate(BaseModel):
    timerId: str
    timerName: str
    duration: int
    date: str
    tag: Optional[str] = None


class Record(BaseModel):
    id: str
    timerId: str
    timerName: str
    startTime: str
    endTime: str
    duration: int
    date: str
    tag: Optional[str] = None


class RecordUpdate(BaseModel):
    duration: Optional[int] = None
    date: Optional[str] = None
    tag: Optional[str] = None


@router.get("/")
async def get_all_records(
    timer_id: Optional[str] = Query(None, alias="timerId"),
    tag: Optional[str] = None,
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate")
):
    """
    全記録を取得（フィルタリング可能）
    
    Parameters:
    - timer_id: 特定のタイマーの記録のみ取得
    - tag: 特定のタグの記録のみ取得
    - start_date: 開始日（YYYY-MM-DD）
    - end_date: 終了日（YYYY-MM-DD）
    """
    try:
        # クエリの構築
        query = "SELECT * FROM c"
        conditions = []
        
        if timer_id:
            conditions.append(f"c.timerId = '{timer_id}'")
        if tag:
            conditions.append(f"c.tag = '{tag}'")
        if start_date:
            conditions.append(f"c.date >= '{start_date}'")
        if end_date:
            conditions.append(f"c.date <= '{end_date}'")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY c.startTime DESC"
        
        records = list(records_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        return records
    
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch records: {str(e)}")


@router.get("/{record_id}")
async def get_record(record_id: str):
    """
    特定の記録を取得
    """
    try:
        record = records_container.read_item(item=record_id, partition_key=record_id)
        return record
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Record not found")
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch record: {str(e)}")


@router.post("/")
async def create_record(record: RecordCreate):
    """
    新しい記録を作成
    """
    try:
        # ユニークなIDを生成（タイムスタンプベース）
        record_id = f"record-{int(time.time() * 1000)}"
        
        new_record = {
            "id": record_id,
            "timerId": record.timerId,
            "timerName": record.timerName,
            "startTime": record.startTime,
            "endTime": record.endTime,
            "duration": record.duration,
            "date": record.date,
            "tag": record.tag
        }
        
        created_record = records_container.create_item(body=new_record)
        return created_record
    
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create record: {str(e)}")


@router.post("/manual")
async def create_manual_record(record: ManualRecordCreate):
    """
    手動で記録を作成（開始・終了時刻を自動計算）
    """
    try:
        # ユニークなIDを生成
        record_id = f"record-{int(time.time() * 1000)}"
        
        # 日付から開始時刻と終了時刻を計算
        # 指定された日時を終了時刻として、duration秒前を開始時刻とする
        end_time = datetime.fromisoformat(record.date.replace('Z', '+00:00'))
        start_time = end_time
        
        # ISO形式の文字列に変換
        start_time_str = start_time.isoformat()
        end_time_str = end_time.isoformat()
        date_str = end_time.strftime('%Y-%m-%d')
        
        new_record = {
            "id": record_id,
            "timerId": record.timerId,
            "timerName": record.timerName,
            "startTime": start_time_str,
            "endTime": end_time_str,
            "duration": record.duration,
            "date": date_str,
            "tag": record.tag
        }
        
        created_record = records_container.create_item(body=new_record)
        return created_record
    
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create manual record: {str(e)}")


@router.put("/{record_id}")
async def update_record(record_id: str, update: RecordUpdate):
    """
    記録を更新（時間、日付、タグ）
    """
    try:
        # 既存の記録を取得
        existing_record = records_container.read_item(item=record_id, partition_key=record_id)
        
        # 更新可能なフィールドを変更
        if update.duration is not None:
            existing_record["duration"] = update.duration
            # 期間が変わった場合、終了時刻も再計算
            start_time = datetime.fromisoformat(existing_record["startTime"].replace('Z', '+00:00'))
            from datetime import timedelta
            end_time = start_time + timedelta(seconds=update.duration)
            existing_record["endTime"] = end_time.isoformat()
        
        if update.date is not None:
            existing_record["date"] = update.date
            # 日付が変わった場合、開始・終了時刻も調整
            new_date = datetime.fromisoformat(update.date)
            old_start = datetime.fromisoformat(existing_record["startTime"].replace('Z', '+00:00'))
            # 時刻部分を保持して日付のみ変更
            new_start = new_date.replace(hour=old_start.hour, minute=old_start.minute, second=old_start.second)
            existing_record["startTime"] = new_start.isoformat()
            from datetime import timedelta
            end_time = new_start + timedelta(seconds=existing_record["duration"])
            existing_record["endTime"] = end_time.isoformat()
        
        if update.tag is not None:
            existing_record["tag"] = update.tag if update.tag else None
        
        # 更新を保存
        updated_record = records_container.replace_item(item=record_id, body=existing_record)
        return updated_record
        
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Record not found")
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to update record: {str(e)}")


@router.delete("/{record_id}")
async def delete_record(record_id: str):
    """
    記録を削除
    """
    try:
        records_container.delete_item(item=record_id, partition_key=record_id)
        return {"message": "Record deleted successfully"}
    except exceptions.CosmosResourceNotFoundError:
        raise HTTPException(status_code=404, detail="Record not found")
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")


@router.get("/stats/summary")
async def get_records_summary(
    timer_id: Optional[str] = Query(None, alias="timerId"),
    tag: Optional[str] = None
):
    """
    記録の統計サマリーを取得
    """
    try:
        # フィルタ条件
        query = "SELECT * FROM c"
        conditions = []
        
        if timer_id:
            conditions.append(f"c.timerId = '{timer_id}'")
        if tag:
            conditions.append(f"c.tag = '{tag}'")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        records = list(records_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        # 統計計算
        total_count = len(records)
        total_duration = sum(r.get("duration", 0) for r in records)
        average_duration = total_duration / total_count if total_count > 0 else 0
        
        # タイマーごとの集計
        timer_stats = {}
        for record in records:
            timer_id = record.get("timerId")
            if timer_id not in timer_stats:
                timer_stats[timer_id] = {
                    "timerId": timer_id,
                    "timerName": record.get("timerName"),
                    "count": 0,
                    "totalDuration": 0
                }
            timer_stats[timer_id]["count"] += 1
            timer_stats[timer_id]["totalDuration"] += record.get("duration", 0)
        
        # タグごとの集計
        tag_stats = {}
        for record in records:
            tag_name = record.get("tag") or "タグなし"
            if tag_name not in tag_stats:
                tag_stats[tag_name] = {
                    "tag": tag_name,
                    "count": 0,
                    "totalDuration": 0
                }
            tag_stats[tag_name]["count"] += 1
            tag_stats[tag_name]["totalDuration"] += record.get("duration", 0)
        
        return {
            "totalCount": total_count,
            "totalDuration": total_duration,
            "averageDuration": average_duration,
            "byTimer": list(timer_stats.values()),
            "byTag": list(tag_stats.values())
        }
    
    except exceptions.CosmosHttpResponseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")
