from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
from database import get_recipes_container, settings_container
from recipe_scraper import RecipeScraper
# RAG機能は無効化（メモリ制約のため）
# from recommendation_engine import get_recommendation_engine
# from vector_store import get_vector_store

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
async def get_recipes(
    favorite: Optional[bool] = None, 
    tag: Optional[str] = None,
    search: Optional[str] = None  # 検索キーワード
):
    """レシピ一覧取得（フィルタリング・検索対応）"""
    try:
        container = get_recipes_container()
        query = "SELECT * FROM c"
        recipes = list(container.query_items(query=query, enable_cross_partition_query=True))
        
        # フィルタリング
        if favorite is not None:
            recipes = [r for r in recipes if r.get("isFavorite") == favorite]
        
        if tag:
            recipes = [r for r in recipes if tag in r.get("tags", [])]
        
        # 検索（名前、材料、タグから部分一致）
        if search:
            search_lower = search.lower()
            filtered_recipes = []
            for r in recipes:
                # 名前での検索
                if search_lower in r.get("name", "").lower():
                    filtered_recipes.append(r)
                    continue
                
                # 材料での検索
                ingredients = r.get("ingredients", [])
                if any(search_lower in ing.lower() for ing in ingredients):
                    filtered_recipes.append(r)
                    continue
                
                # タグでの検索
                tags = r.get("tags", [])
                if any(search_lower in t.lower() for t in tags):
                    filtered_recipes.append(r)
                    continue
                
                # 手順での検索
                steps = r.get("steps", [])
                if any(search_lower in s.lower() for s in steps):
                    filtered_recipes.append(r)
                    continue
            
            recipes = filtered_recipes
        
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
        
        # RAG機能は無効化（メモリ制約のため）
        # # ベクトルストアに追加
        # try:
        #     vector_store = get_vector_store()
        #     vector_store.add_recipe(new_recipe["id"], new_recipe)
        # except Exception as ve:
        #     print(f"Warning: Failed to add recipe to vector store: {ve}")
        
        return Recipe(**new_recipe)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 外部サイトからレシピ取り込み
@router.post("/import")
async def import_recipe(url: str):
    """外部サイトからレシピをスクレイピング"""
    try:
        # URLからレシピ情報を取得
        recipe_data = RecipeScraper.scrape(url)
        
        if not recipe_data:
            raise HTTPException(status_code=400, detail="レシピ情報を取得できませんでした")
        
        # 取得したデータを返す（保存はフロントエンドで確認後）
        return {"data": recipe_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"レシピの取り込みに失敗しました: {str(e)}")

# AI提案機能
class SuggestRequest(BaseModel):
    ingredients: List[str]

@router.post("/suggest")
async def suggest_recipe(request: SuggestRequest):
    """材料からレシピを提案（AI機能）"""
    try:
        import os
        from openai import OpenAI
        from azure.cosmos import exceptions as cosmos_exceptions
        
        # 設定からAPIキーを取得
        try:
            settings = settings_container.read_item(item="app-settings", partition_key="app-settings")
            api_key = settings.get("openaiApiKey")
        except cosmos_exceptions.CosmosResourceNotFoundError:
            api_key = None
        
        # 環境変数からもフォールバック
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            raise HTTPException(
                status_code=503, 
                detail="AI機能は現在利用できません（APIキーが設定されていません）"
            )
        
        client = OpenAI(api_key=api_key)
        
        # プロンプト作成
        ingredients_text = "、".join(request.ingredients)
        prompt = f"""以下の材料を使ったレシピを提案してください。

材料: {ingredients_text}

以下のJSON形式で回答してください：
{{
  "name": "レシピ名",
  "ingredients": ["材料1 分量", "材料2 分量", ...],
  "steps": ["手順1", "手順2", ...],
  "cookingTime": 調理時間（分、数値のみ）,
  "tags": ["タグ1", "タグ2", ...]
}}

JSONのみを返してください。説明文は不要です。"""

        # OpenAI API呼び出し
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは料理のプロフェッショナルです。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # レスポンス解析
        import json
        content = response.choices[0].message.content
        # JSON部分のみ抽出
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        recipe_data = json.loads(content.strip())
        recipe_data["tags"] = recipe_data.get("tags", []) + ["AI提案"]
        
        return {"data": recipe_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"AI suggestion error: {e}")
        raise HTTPException(status_code=500, detail=f"AI提案の生成に失敗しました: {str(e)}")

# RAG機能は無効化（メモリ制約のため）
# # レシピ推薦機能（RAGベース）
# @router.get("/recommend")
# async def recommend_recipes(limit: int = 5, tag: Optional[str] = None, ingredient: Optional[str] = None):
#     """ユーザーの調理履歴に基づいてレシピを推薦（RAGベース）"""
#     try:
#         print(f"[DEBUG] Starting recommendation with limit={limit}, tag={tag}, ingredient={ingredient}")
#         
#         # 推薦エンジンを取得
#         engine = get_recommendation_engine()
#         print("[DEBUG] Got recommendation engine")
#         
#         # 調理記録から作ったレシピIDを取得
#         from database import get_records_container
#         records_container = get_records_container()
#         query = "SELECT c.recipeId, c.isFavorite FROM c WHERE c.activityType = 'cooking'"
#         records = list(records_container.query_items(query=query, enable_cross_partition_query=True))
#         print(f"[DEBUG] Found {len(records)} cooking records")
#         
#         # 調理したレシピIDのリストを作成
#         cooked_recipe_ids = list(set([r["recipeId"] for r in records if r.get("recipeId")]))
#         print(f"[DEBUG] Cooked recipe IDs: {cooked_recipe_ids}")
#         
#         # 推薦を取得（推薦理由も生成）
#         recommendations = engine.recommend_recipes(
#             cooked_recipe_ids=cooked_recipe_ids,
#             n_recommendations=limit,
#             generate_reason=True,
#             tag_filter=tag,
#             ingredient_filter=ingredient
#         )
#         print(f"[DEBUG] Got {len(recommendations)} recommendations")
#         
#         return {"data": recommendations}
#         
#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"Recommendation error: {e}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"レシピの推薦に失敗しました: {str(e)}")

# # ベクトルインデックス再構築（管理用）
# @router.post("/embeddings/rebuild")
# async def rebuild_embeddings():
#     """全レシピのベクトルインデックスを再構築"""
#     try:
#         engine = get_recommendation_engine()
#         result = engine.rebuild_vector_index()
#         return {"message": "Vector index rebuilt successfully", "data": result}
#     except Exception as e:
#         print(f"Rebuild index error: {e}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"インデックスの再構築に失敗しました: {str(e)}")

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
        
        # RAG機能は無効化（メモリ制約のため）
        # # ベクトルストアを更新
        # try:
        #     vector_store = get_vector_store()
        #     vector_store.add_recipe(recipe_id, existing_recipe)
        # except Exception as ve:
        #     print(f"Warning: Failed to update recipe in vector store: {ve}")
        
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
        
        # RAG機能は無効化（メモリ制約のため）
        # # ベクトルストアから削除
        # try:
        #     vector_store = get_vector_store()
        #     vector_store.delete_recipe(recipe_id)
        # except Exception as ve:
        #     print(f"Warning: Failed to delete recipe from vector store: {ve}")
        
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
