"""
Todos router - やることリスト機能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
from database import get_todos_container

router = APIRouter()

# Pydanticモデル
class Subtask(BaseModel):
    id: str
    title: str
    completed: bool = False

class RecurringSettings(BaseModel):
    frequency: str  # 'daily', 'weekly', 'monthly'
    interval: int = 1
    endDate: Optional[str] = None

class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = 'medium'  # 'high', 'medium', 'low'
    dueDate: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    subtasks: List[Subtask] = []
    recurring: Optional[RecurringSettings] = None

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    subtasks: Optional[List[Subtask]] = None
    completed: Optional[bool] = None
    recurring: Optional[RecurringSettings] = None

class Todo(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    priority: str
    dueDate: Optional[str] = None
    category: Optional[str] = None
    tags: List[str]
    completed: bool
    completedAt: Optional[str] = None
    createdAt: str
    subtasks: List[Subtask]
    recurring: Optional[RecurringSettings] = None

@router.get("/todos")
async def get_todos(
    priority: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    completed: Optional[bool] = None,
    limit: int = 100
):
    """やることリスト一覧取得"""
    try:
        container = get_todos_container()
        
        # クエリ構築
        query = "SELECT * FROM c WHERE 1=1"
        if priority:
            query += f" AND c.priority = '{priority}'"
        if category:
            query += f" AND c.category = '{category}'"
        if tag:
            query += f" AND ARRAY_CONTAINS(c.tags, '{tag}')"
        if completed is not None:
            query += f" AND c.completed = {str(completed).lower()}"
        
        # 締切でソート（未完了タスクを優先、締切が近い順）
        query += " ORDER BY c.completed ASC, c.dueDate ASC"
        
        todos = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        return {"data": todos[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/todos/{todo_id}")
async def get_todo(todo_id: str):
    """やること詳細取得"""
    try:
        container = get_todos_container()
        todo = container.read_item(item=todo_id, partition_key=todo_id)
        return {"data": todo}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Todo not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/todos")
async def create_todo(todo: TodoCreate):
    """やること新規作成"""
    try:
        container = get_todos_container()
        
        new_todo = {
            "id": str(uuid.uuid4()),
            "title": todo.title,
            "description": todo.description,
            "priority": todo.priority,
            "dueDate": todo.dueDate,
            "category": todo.category,
            "tags": todo.tags,
            "completed": False,
            "completedAt": None,
            "createdAt": datetime.utcnow().isoformat(),
            "subtasks": [s.dict() for s in todo.subtasks],
            "recurring": todo.recurring.dict() if todo.recurring else None
        }
        
        container.create_item(body=new_todo)
        return {"data": new_todo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/todos/{todo_id}")
async def update_todo(todo_id: str, update: TodoUpdate):
    """やること更新"""
    try:
        container = get_todos_container()
        
        todo = container.read_item(item=todo_id, partition_key=todo_id)
        
        # 更新
        if update.title is not None:
            todo["title"] = update.title
        if update.description is not None:
            todo["description"] = update.description
        if update.priority is not None:
            todo["priority"] = update.priority
        if update.dueDate is not None:
            todo["dueDate"] = update.dueDate
        if update.category is not None:
            todo["category"] = update.category
        if update.tags is not None:
            todo["tags"] = update.tags
        if update.subtasks is not None:
            todo["subtasks"] = [s.dict() for s in update.subtasks]
        if update.completed is not None:
            todo["completed"] = update.completed
            if update.completed:
                todo["completedAt"] = datetime.utcnow().isoformat()
            else:
                todo["completedAt"] = None
        if update.recurring is not None:
            todo["recurring"] = update.recurring.dict() if update.recurring else None
        
        container.replace_item(item=todo_id, body=todo)
        return {"data": todo}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Todo not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str):
    """やること削除"""
    try:
        container = get_todos_container()
        container.delete_item(item=todo_id, partition_key=todo_id)
        return {"message": "Todo deleted successfully"}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Todo not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/todos/{todo_id}/complete")
async def complete_todo(todo_id: str):
    """やること完了マーク"""
    try:
        container = get_todos_container()
        
        todo = container.read_item(item=todo_id, partition_key=todo_id)
        todo["completed"] = True
        todo["completedAt"] = datetime.utcnow().isoformat()
        
        container.replace_item(item=todo_id, body=todo)
        
        # 繰り返し設定がある場合、次のタスクを生成
        if todo.get("recurring"):
            await generate_next_recurring_todo(todo)
        
        return {"data": todo}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Todo not found")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_next_recurring_todo(completed_todo: dict):
    """繰り返しタスクの次回分を生成"""
    recurring = completed_todo.get("recurring")
    if not recurring:
        return
    
    # 次回の締切を計算
    frequency = recurring["frequency"]
    interval = recurring["interval"]
    
    if completed_todo.get("dueDate"):
        current_due = datetime.fromisoformat(completed_todo["dueDate"])
    else:
        current_due = datetime.utcnow()
    
    if frequency == "daily":
        next_due = current_due + timedelta(days=interval)
    elif frequency == "weekly":
        next_due = current_due + timedelta(weeks=interval)
    elif frequency == "monthly":
        # 月の計算（簡易版）
        next_due = current_due + timedelta(days=30 * interval)
    else:
        return
    
    # 終了日チェック
    if recurring.get("endDate"):
        end_date = datetime.fromisoformat(recurring["endDate"])
        if next_due > end_date:
            return
    
    # 新しいタスクを作成
    container = get_todos_container()
    new_todo = {
        "id": str(uuid.uuid4()),
        "title": completed_todo["title"],
        "description": completed_todo.get("description"),
        "priority": completed_todo["priority"],
        "dueDate": next_due.isoformat(),
        "category": completed_todo.get("category"),
        "tags": completed_todo["tags"],
        "completed": False,
        "completedAt": None,
        "createdAt": datetime.utcnow().isoformat(),
        "subtasks": [
            {"id": str(uuid.uuid4()), "title": st["title"], "completed": False}
            for st in completed_todo.get("subtasks", [])
        ],
        "recurring": recurring
    }
    
    container.create_item(body=new_todo)

@router.post("/todos/recurring/generate")
async def generate_recurring_todos():
    """期限切れの繰り返しタスクを自動生成"""
    try:
        container = get_todos_container()
        
        # 繰り返し設定があり、完了済みのタスクを取得
        query = "SELECT * FROM c WHERE c.recurring != null AND c.completed = true"
        completed_recurring_todos = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        generated_count = 0
        for todo in completed_recurring_todos:
            # すでに次回分が存在するかチェック
            if not should_generate_next(todo):
                continue
            
            await generate_next_recurring_todo(todo)
            generated_count += 1
        
        return {"message": f"Generated {generated_count} recurring todos"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def should_generate_next(todo: dict) -> bool:
    """次回タスクを生成すべきかチェック"""
    if not todo.get("recurring"):
        return False
    
    if not todo.get("dueDate"):
        return False
    
    due_date = datetime.fromisoformat(todo["dueDate"])
    now = datetime.utcnow()
    
    # 締切が過去の場合、次回分を生成
    return due_date < now

@router.get("/todos/categories")
async def get_categories():
    """カテゴリ一覧取得"""
    try:
        container = get_todos_container()
        
        query = "SELECT DISTINCT c.category FROM c WHERE c.category != null"
        categories = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        category_list = [c["category"] for c in categories if c.get("category")]
        return {"data": category_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/todos/tags")
async def get_tags():
    """タグ一覧取得"""
    try:
        container = get_todos_container()
        
        # すべてのTodoを取得してタグを集計
        query = "SELECT c.tags FROM c"
        todos = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        tags_set = set()
        for todo in todos:
            for tag in todo.get("tags", []):
                tags_set.add(tag)
        
        return {"data": list(tags_set)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
