"""
Embeddingサービス
Sentence Transformersを使用してテキストをベクトル化
"""
from sentence_transformers import SentenceTransformer
from typing import List, Union
import numpy as np
from functools import lru_cache


class EmbeddingService:
    """テキストembedding生成サービス"""
    
    def __init__(self, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        """
        Args:
            model_name: 使用するSentence Transformersモデル
                       デフォルトは日本語対応の軽量モデル
        """
        self.model_name = model_name
        self._model = None
        
    @property
    def model(self):
        """遅延ロード: 初回アクセス時にモデルをロード"""
        if self._model is None:
            print(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
        return self._model
    
    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        """
        テキストをベクトル化
        
        Args:
            texts: 単一のテキストまたはテキストのリスト
            
        Returns:
            numpy配列のベクトル (単一の場合は1D、リストの場合は2D)
        """
        if isinstance(texts, str):
            texts = [texts]
            return_single = True
        else:
            return_single = False
            
        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=False
        )
        
        if return_single:
            return embeddings[0]
        return embeddings
    
    def encode_recipe(self, recipe_data: dict) -> np.ndarray:
        """
        レシピデータを結合してベクトル化
        
        Args:
            recipe_data: レシピの辞書データ
                {
                    "name": str,
                    "ingredients": List[str],
                    "steps": List[str],
                    "tags": List[str]
                }
        
        Returns:
            ベクトル表現
        """
        # レシピ情報を意味のある文章に変換
        text_parts = []
        
        # レシピ名
        if recipe_data.get("name"):
            text_parts.append(f"レシピ名: {recipe_data['name']}")
        
        # タグ
        if recipe_data.get("tags"):
            tags_text = "、".join(recipe_data["tags"])
            text_parts.append(f"カテゴリ: {tags_text}")
        
        # 材料
        if recipe_data.get("ingredients"):
            ingredients_text = "、".join(recipe_data["ingredients"][:5])  # 最初の5つ
            text_parts.append(f"材料: {ingredients_text}")
        
        # 手順の概要（最初の2つ）
        if recipe_data.get("steps"):
            steps_text = "。".join(recipe_data["steps"][:2])
            text_parts.append(f"作り方: {steps_text}")
        
        combined_text = "。".join(text_parts)
        return self.encode(combined_text)
    
    @lru_cache(maxsize=1000)
    def encode_cached(self, text: str) -> tuple:
        """
        キャッシュ付きエンコーディング
        同じテキストの重複計算を避ける
        
        Note: numpy配列はhashableでないため、tupleに変換
        """
        embedding = self.encode(text)
        return tuple(embedding.tolist())
    
    def get_embedding_dim(self) -> int:
        """埋め込みベクトルの次元数を取得"""
        return self.model.get_sentence_embedding_dimension()


# グローバルインスタンス（シングルトンパターン）
_embedding_service = None


def get_embedding_service() -> EmbeddingService:
    """Embeddingサービスのシングルトンインスタンスを取得"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
