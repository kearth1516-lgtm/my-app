"""
ベクトルストア（ChromaDB）
レシピのベクトル検索機能を提供
"""
import chromadb
from typing import List, Dict, Optional
import os
from embedding_service import get_embedding_service


class RecipeVectorStore:
    """レシピベクトルストア"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        """
        Args:
            persist_directory: ChromaDBの永続化ディレクトリ
        """
        self.persist_directory = persist_directory
        
        # ディレクトリが存在しない場合は作成
        os.makedirs(persist_directory, exist_ok=True)
        
        # ChromaDBクライアントを初期化（新しいAPI）
        self.client = chromadb.PersistentClient(path=persist_directory)
        
        # コレクション名
        self.collection_name = "recipes"
        
        # Embeddingサービス
        self.embedding_service = get_embedding_service()
        
        # コレクションを取得または作成
        self._initialize_collection()
    
    def _initialize_collection(self):
        """コレクションの初期化"""
        try:
            self.collection = self.client.get_collection(self.collection_name)
            print(f"Loaded existing collection: {self.collection_name}")
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "Recipe embeddings for RAG recommendation"}
            )
            print(f"Created new collection: {self.collection_name}")
    
    def add_recipe(self, recipe_id: str, recipe_data: dict):
        """
        レシピをベクトルストアに追加
        
        Args:
            recipe_id: レシピのID
            recipe_data: レシピデータ
        """
        # ベクトル化
        embedding = self.embedding_service.encode_recipe(recipe_data)
        
        # メタデータ
        metadata = {
            "recipe_id": recipe_id,
            "name": recipe_data.get("name", ""),
            "tags": ",".join(recipe_data.get("tags", [])),
            "times_cooked": recipe_data.get("timesCooked", 0),
            "is_favorite": recipe_data.get("isFavorite", False)
        }
        
        # テキスト（検索用）
        document = f"{recipe_data.get('name', '')} {' '.join(recipe_data.get('tags', []))}"
        
        # 追加（IDが存在する場合は更新）
        try:
            self.collection.upsert(
                ids=[recipe_id],
                embeddings=[embedding.tolist()],
                documents=[document],
                metadatas=[metadata]
            )
            print(f"Added/Updated recipe: {recipe_id} - {recipe_data.get('name')}")
        except Exception as e:
            print(f"Error adding recipe {recipe_id}: {e}")
    
    def delete_recipe(self, recipe_id: str):
        """レシピを削除"""
        try:
            self.collection.delete(ids=[recipe_id])
            print(f"Deleted recipe: {recipe_id}")
        except Exception as e:
            print(f"Error deleting recipe {recipe_id}: {e}")
    
    def search_similar_recipes(
        self, 
        query_embedding: List[float], 
        n_results: int = 5,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        類似レシピを検索
        
        Args:
            query_embedding: クエリのベクトル
            n_results: 取得する結果数
            exclude_ids: 除外するレシピID
            
        Returns:
            類似レシピのリスト
        """
        try:
            # 検索実行
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results + (len(exclude_ids) if exclude_ids else 0)
            )
            
            # 結果を整形
            recipes = []
            for i in range(len(results['ids'][0])):
                recipe_id = results['ids'][0][i]
                
                # 除外IDをスキップ
                if exclude_ids and recipe_id in exclude_ids:
                    continue
                
                recipe = {
                    "recipe_id": recipe_id,
                    "name": results['metadatas'][0][i].get('name', ''),
                    "tags": results['metadatas'][0][i].get('tags', '').split(','),
                    "distance": results['distances'][0][i] if 'distances' in results else None,
                    "times_cooked": results['metadatas'][0][i].get('times_cooked', 0),
                    "is_favorite": results['metadatas'][0][i].get('is_favorite', False)
                }
                recipes.append(recipe)
                
                if len(recipes) >= n_results:
                    break
            
            return recipes
        except Exception as e:
            print(f"Error searching recipes: {e}")
            return []
    
    def rebuild_index(self, recipes: List[Dict]):
        """
        インデックス再構築（全レシピ）
        
        Args:
            recipes: レシピのリスト
            
        Returns:
            再構築の統計情報
        """
        print(f"Rebuilding index with {len(recipes)} recipes...")
        
        # 既存のコレクションを削除
        try:
            self.client.delete_collection(self.collection_name)
        except:
            pass
        
        # 新しいコレクションを作成
        self._initialize_collection()
        
        # 全レシピを追加
        for recipe in recipes:
            self.add_recipe(recipe.get("id"), recipe)
        
        print("Index rebuild complete!")
        
        return {
            "recipes_indexed": len(recipes),
            "collection_count": self.get_collection_count()
        }
    
    def get_collection_count(self) -> int:
        """コレクション内のレシピ数を取得"""
        try:
            return self.collection.count()
        except:
            return 0


# グローバルインスタンス
_vector_store = None


def get_vector_store() -> RecipeVectorStore:
    """ベクトルストアのシングルトンインスタンスを取得"""
    global _vector_store
    if _vector_store is None:
        _vector_store = RecipeVectorStore()
    return _vector_store
