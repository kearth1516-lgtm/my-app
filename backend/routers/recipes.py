from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
from database import get_recipes_container

router = APIRouter()

# Pydanticモデル
class RecipeCreate(BaseModel):
    name: str
    ingredients: List[str] = []
    steps: List[str] = []  # 調理手順
    cookingTime: Optional[int] = None  # 分単位
    source: Optional[str] = None  # レシピURL
    tags: List[str] = []
    isFavorite: bool = False

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    ingredients: Optional[List[str]] = None
    steps: Optional[List[str]] = None
    cookingTime: Optional[int] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None
    isFavorite: Optional[bool] = None

class Recipe(BaseModel):
    id: str
    name: str
    ingredients: List[str]
    steps: List[str]
    cookingTime: Optional[int] = None
    source: Optional[str] = None
    tags: List[str]
    isFavorite: bool
    timesCooked: int
    createdAt: str

@router.get("/")
async def get_recipes(favorite: Optional[bool] = None, tag: Optional[str] = None):
    """レシピ一覧取得（フィルタリング対応）"""
    try:
        container = get_recipes_container()
        query = "SELECT * FROM c"
        recipes = list(container.query_items(query=query, enable_cross_partition_query=True))
        
        # フィルタリング
        if favorite is not None:
            recipes = [r for r in recipes if r.get("isFavorite") == favorite]
        
        if tag:
            recipes = [r for r in recipes if tag in r.get("tags", [])]
        
        # 作成日時でソート（新しい順）
        recipes.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        
        return {"data": recipes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_recipe(recipe: RecipeCreate):
    """レシピ作成"""
    try:
        container = get_recipes_container()
        
        new_recipe = {
            "id": str(uuid.uuid4()),
            "name": recipe.name,
            "ingredients": recipe.ingredients,
            "steps": recipe.steps,
            "cookingTime": recipe.cookingTime,
            "source": recipe.source,
            "tags": recipe.tags,
            "isFavorite": recipe.isFavorite,
            "timesCooked": 0,
            "createdAt": datetime.utcnow().isoformat() + "Z"
        }
        
        container.create_item(body=new_recipe)
        return {"data": new_recipe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{recipe_id}")
async def get_recipe(recipe_id: str):
    """レシピ詳細取得"""
    try:
        container = get_recipes_container()
        recipe = container.read_item(item=recipe_id, partition_key=recipe_id)
        return {"data": recipe}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Recipe not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{recipe_id}")
async def update_recipe(recipe_id: str, update: RecipeUpdate):
    """レシピ更新"""
    try:
        container = get_recipes_container()
        
        # 既存のレシピを取得
        existing_recipe = container.read_item(item=recipe_id, partition_key=recipe_id)
        
        # 更新
        if update.name is not None:
            existing_recipe["name"] = update.name
        if update.ingredients is not None:
            existing_recipe["ingredients"] = update.ingredients
        if update.steps is not None:
            existing_recipe["steps"] = update.steps
        if update.cookingTime is not None:
            existing_recipe["cookingTime"] = update.cookingTime
        if update.source is not None:
            existing_recipe["source"] = update.source
        if update.tags is not None:
            existing_recipe["tags"] = update.tags
        if update.isFavorite is not None:
            existing_recipe["isFavorite"] = update.isFavorite
        
        container.replace_item(item=recipe_id, body=existing_recipe)
        return {"data": existing_recipe}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Recipe not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{recipe_id}")
async def delete_recipe(recipe_id: str):
    """レシピ削除"""
    try:
        container = get_recipes_container()
        container.delete_item(item=recipe_id, partition_key=recipe_id)
        return {"message": "Recipe deleted successfully"}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Recipe not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{recipe_id}/cook")
async def record_cooking(recipe_id: str):
    """調理記録（回数をインクリメント）"""
    try:
        container = get_recipes_container()
        recipe = container.read_item(item=recipe_id, partition_key=recipe_id)
        recipe["timesCooked"] = recipe.get("timesCooked", 0) + 1
        container.replace_item(item=recipe_id, body=recipe)
        return {"data": recipe}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Recipe not found")
        raise HTTPException(status_code=500, detail=str(e))

# お気に入り切り替え
@router.patch("/{recipe_id}/favorite")
async def toggle_favorite(recipe_id: str, is_favorite: bool):
    """お気に入り切り替え"""
    try:
        container = get_recipes_container()
        recipe = container.read_item(item=recipe_id, partition_key=recipe_id)
        recipe["isFavorite"] = is_favorite
        container.replace_item(item=recipe_id, body=recipe)
        return {"data": recipe}
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Recipe not found")
        raise HTTPException(status_code=500, detail=str(e))
