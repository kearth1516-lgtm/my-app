"""
レシピ推薦エンジン
RAGベースのパーソナライズ推薦を提供
"""
from typing import List, Dict, Optional
import numpy as np
from embedding_service import get_embedding_service
from vector_store import get_vector_store
from database import get_recipes_container
import os
from openai import OpenAI


class RecipeRecommendationEngine:
    """レシピ推薦エンジン"""
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.vector_store = get_vector_store()
        
        # OpenAI設定（オプション）
        self.openai_client = None
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.openai_client = OpenAI(api_key=api_key)
    
    def get_user_preference_embedding(
        self, 
        cooked_recipe_ids: List[str],
        favorite_weight: float = 2.0
    ) -> Optional[np.ndarray]:
        """
        ユーザーの調理履歴からpreference embeddingを生成
        
        Args:
            cooked_recipe_ids: 調理したレシピのIDリスト
            favorite_weight: お気に入りレシピの重み
            
        Returns:
            ユーザーのpreference embedding
        """
        if not cooked_recipe_ids:
            return None
        
        # レシピデータを取得
        container = get_recipes_container()
        recipe_embeddings = []
        weights = []
        
        for recipe_id in cooked_recipe_ids:
            try:
                recipe = container.read_item(item=recipe_id, partition_key=recipe_id)
                
                # Embeddingを生成
                embedding = self.embedding_service.encode_recipe(recipe)
                recipe_embeddings.append(embedding)
                
                # お気に入りには重みを付ける
                weight = favorite_weight if recipe.get("isFavorite", False) else 1.0
                weights.append(weight)
            except:
                continue
        
        if not recipe_embeddings:
            return None
        
        # 重み付き平均を計算
        embeddings_array = np.array(recipe_embeddings)
        weights_array = np.array(weights).reshape(-1, 1)
        weighted_mean = np.average(embeddings_array, axis=0, weights=weights_array.flatten())
        
        return weighted_mean
    
    def recommend_recipes(
        self,
        cooked_recipe_ids: List[str],
        n_recommendations: int = 5,
        generate_reason: bool = False
    ) -> List[Dict]:
        """
        レシピを推薦
        
        Args:
            cooked_recipe_ids: 調理したレシピのIDリスト
            n_recommendations: 推薦するレシピ数
            generate_reason: Azure OpenAIで推薦理由を生成するか
            
        Returns:
            推薦レシピのリスト
        """
        # ユーザーのpreference embeddingを取得
        user_embedding = self.get_user_preference_embedding(cooked_recipe_ids)
        
        if user_embedding is None:
            # 調理履歴がない場合は、人気レシピを返す
            return self._get_popular_recipes(n_recommendations)
        
        # ベクトル検索で類似レシピを取得
        similar_recipes = self.vector_store.search_similar_recipes(
            query_embedding=user_embedding.tolist(),
            n_results=n_recommendations,
            exclude_ids=cooked_recipe_ids  # 既に作ったレシピは除外
        )
        
        # 推薦理由を生成（オプション）
        if generate_reason and self.openai_client:
            similar_recipes = self._add_recommendation_reasons(
                similar_recipes,
                cooked_recipe_ids
            )
        
        return similar_recipes
    
    def _get_popular_recipes(self, n: int = 5) -> List[Dict]:
        """
        人気レシピを取得（フォールバック）
        
        Args:
            n: 取得するレシピ数
            
        Returns:
            人気レシピのリスト
        """
        container = get_recipes_container()
        
        # 全レシピを取得（ORDER BYは使用不可）
        query = "SELECT * FROM c"
        recipes = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        # Pythonでtimes Cookedでソート
        recipes.sort(key=lambda x: x.get("timesCooked", 0), reverse=True)
        
        return recipes[:n]
    
    def _add_recommendation_reasons(
        self,
        recipes: List[Dict],
        cooked_recipe_ids: List[str]
    ) -> List[Dict]:
        """
        Azure OpenAIで推薦理由を生成
        
        Args:
            recipes: 推薦レシピのリスト
            cooked_recipe_ids: 調理したレシピのIDリスト
            
        Returns:
            推薦理由付きレシピリスト
        """
        if not self.openai_client:
            return recipes
        
        try:
            # 調理したレシピの名前を取得
            container = get_recipes_container()
            cooked_recipe_names = []
            for recipe_id in cooked_recipe_ids[-5:]:  # 最近の5件
                try:
                    recipe = container.read_item(item=recipe_id, partition_key=recipe_id)
                    cooked_recipe_names.append(recipe.get("name", ""))
                except:
                    continue
            
            # 推薦レシピの名前
            recommended_names = [r.get("name", "") for r in recipes]
            
            # プロンプト作成
            prompt = f"""ユーザーは以下のレシピをよく作ります:
{', '.join(cooked_recipe_names)}

次のレシピをおすすめする理由を、それぞれ1文で簡潔に説明してください:
{', '.join(recommended_names)}

各レシピの推薦理由をJSON配列形式で返してください。
例: ["理由1", "理由2", "理由3"]
"""
            
            # OpenAI API呼び出し
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "あなたはレシピ推薦の専門家です。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            # レスポンスをパース
            import json
            content = response.choices[0].message.content
            
            # JSON部分を抽出
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            reasons = json.loads(content.strip())
            
            # 推薦理由を追加
            for i, recipe in enumerate(recipes):
                if i < len(reasons):
                    recipe["recommendation_reason"] = reasons[i]
            
        except Exception as e:
            print(f"Error generating recommendation reasons: {e}")
        
        return recipes
    
    def rebuild_vector_index(self):
        """ベクトルインデックスを再構築"""
        container = get_recipes_container()
        query = "SELECT * FROM c"
        recipes = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        self.vector_store.rebuild_index(recipes)


# グローバルインスタンス
_recommendation_engine = None


def get_recommendation_engine() -> RecipeRecommendationEngine:
    """推薦エンジンのシングルトンインスタンスを取得"""
    global _recommendation_engine
    if _recommendation_engine is None:
        _recommendation_engine = RecipeRecommendationEngine()
    return _recommendation_engine
