"""
ベクトルストア初期化スクリプト
既存の全レシピをベクトルストアに追加します。
初回セットアップ時、またはインデックスを再構築したい場合に実行してください。

使い方:
    python init_vector_store.py
"""

import sys
from database import get_recipes_container
from vector_store import get_vector_store
from embedding_service import get_embedding_service

def init_vector_store():
    """既存レシピを全てベクトルストアに追加"""
    print("ベクトルストアを初期化しています...")
    
    try:
        # サービス初期化
        print("1. Embeddingサービスを初期化中...")
        embedding_service = get_embedding_service()
        print(f"   ✓ モデルロード完了（次元数: {embedding_service.get_embedding_dim()}）")
        
        print("2. ベクトルストアを初期化中...")
        vector_store = get_vector_store()
        
        # 既存のレシピ数を確認
        existing_count = vector_store.get_collection_count()
        print(f"   現在のレシピ数: {existing_count}")
        
        # 全レシピを取得
        print("3. Cosmos DBから全レシピを取得中...")
        container = get_recipes_container()
        query = "SELECT * FROM c"
        recipes = list(container.query_items(query=query, enable_cross_partition_query=True))
        print(f"   ✓ {len(recipes)}件のレシピを取得")
        
        if len(recipes) == 0:
            print("⚠ レシピが見つかりません。先にレシピを登録してください。")
            return
        
        # インデックス再構築
        print("4. ベクトルインデックスを構築中...")
        result = vector_store.rebuild_index(recipes)
        
        print(f"\n✅ 初期化完了:")
        print(f"   - 追加されたレシピ: {result['recipes_indexed']}件")
        print(f"   - インデックスサイズ: {result['collection_count']}件")
        
        return result
        
    except Exception as e:
        print(f"\n❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    init_vector_store()
