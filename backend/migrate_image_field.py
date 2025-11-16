"""
Cosmos DBのタイマーデータを修正するスクリプト
imageUrlフィールドをimageフィールドに移行し、nullの場合はデフォルト画像を設定
"""
import os
from dotenv import load_dotenv
from azure.cosmos import CosmosClient

# 環境変数読み込み
load_dotenv()

# Cosmos DB接続
endpoint = os.getenv("COSMOS_ENDPOINT")
key = os.getenv("COSMOS_KEY")
database_name = os.getenv("COSMOS_DATABASE_NAME", "my-app-db")

client = CosmosClient(endpoint, key)
database = client.get_database_client(database_name)
timers_container = database.get_container_client("timers")

# 全タイマーを取得
timers = list(timers_container.query_items(
    query="SELECT * FROM c",
    enable_cross_partition_query=True
))

print(f"Found {len(timers)} timers")

# 各タイマーを更新
for timer in timers:
    updated = False
    
    # imageUrlフィールドがあればimageに移行
    if "imageUrl" in timer:
        timer["image"] = timer["imageUrl"]
        del timer["imageUrl"]
        updated = True
        print(f"Timer {timer['id']}: Migrated imageUrl to image")
    
    # imageがnullまたは存在しない場合、デフォルト画像を設定
    if "image" not in timer or timer["image"] is None:
        timer["image"] = "/images/mogu.jpg"
        updated = True
        print(f"Timer {timer['id']}: Set default image")
    
    # 更新が必要な場合のみupsert
    if updated:
        timers_container.upsert_item(timer)
        print(f"Timer {timer['id']}: Updated successfully")

print("\nMigration complete!")
