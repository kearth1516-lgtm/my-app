from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Recipe(BaseModel):
    id: Optional[str] = None
    name: str
    ingredients: List[str]
    cookingTime: int
    source: Optional[str] = None
    tags: List[str] = []
    isFavorite: bool = False
    timesCooked: int = 0

@router.get("/")
async def get_recipes():
    """レシピ一覧取得"""
    # TODO: 実装
    return []

@router.post("/")
async def create_recipe(recipe: Recipe):
    """レシピ作成"""
    # TODO: 実装
    return {"id": "recipe-001", **recipe.dict()}

@router.get("/{recipe_id}")
async def get_recipe(recipe_id: str):
    """レシピ詳細取得"""
    # TODO: 実装
    raise HTTPException(status_code=404, detail="Recipe not found")

@router.put("/{recipe_id}")
async def update_recipe(recipe_id: str, recipe: Recipe):
    """レシピ更新"""
    # TODO: 実装
    return {"id": recipe_id, **recipe.dict()}

@router.delete("/{recipe_id}")
async def delete_recipe(recipe_id: str):
    """レシピ削除"""
    # TODO: 実装
    return {"message": "Recipe deleted"}

@router.post("/{recipe_id}/cook")
async def record_cooking(recipe_id: str):
    """調理記録"""
    # TODO: 実装
    return {"message": "Cooking recorded", "recipe_id": recipe_id}
