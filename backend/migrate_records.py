"""
既存のタイマーからrecordsフィールドを削除し、recordsコンテナに移行するスクリプト
"""
import os
from dotenv import load_dotenv
from azure.cosmos import CosmosClient
import time

# 環境変数読み込み
load_dotenv()

# Cosmos DB接続
endpoint = os.getenv("COSMOS_ENDPOINT")
key = os.getenv("COSMOS_KEY")
database_name = os.getenv("COSMOS_DATABASE_NAME", "my-app-db")

client = CosmosClient(endpoint, key)
database = client.get_database_client(database_name)
timers_container = database.get_container_client("timers")
records_container = database.get_container_client("records")

print("=== タイマーデータのマイグレーション開始 ===\n")

# 全タイマーを取得
timers = list(timers_container.query_items(
    query="SELECT * FROM c",
    enable_cross_partition_query=True
))

print(f"Found {len(timers)} timers\n")

# 各タイマーを処理
total_records_migrated = 0

for timer in timers:
    timer_id = timer.get("id")
    timer_name = timer.get("name")
    records = timer.get("records", [])
    
    print(f"Timer: {timer_name} (ID: {timer_id})")
    print(f"  - Records found: {len(records)}")
    
    # recordsがある場合、recordsコンテナに移行
    if records:
        for record in records:
            # 新しい記録IDを生成
            record_id = f"record-{int(time.time() * 1000000)}"
            
            new_record = {
                "id": record_id,
                "timerId": timer_id,
                "timerName": timer_name,
                "startTime": record.get("startTime"),
                "endTime": record.get("endTime"),
                "duration": record.get("duration"),
                "date": record.get("date"),
                "tag": record.get("tag")
            }
            
            # recordsコンテナに保存
            records_container.create_item(body=new_record)
            total_records_migrated += 1
            time.sleep(0.001)  # IDの重複を避けるため
        
        print(f"  - Migrated {len(records)} records to records container")
    
    # タイマーからrecordsフィールドを削除
    if "records" in timer:
        del timer["records"]
        timers_container.upsert_item(body=timer)
        print(f"  - Removed records field from timer")
    
    print()

print("=== マイグレーション完了 ===")
print(f"Total records migrated: {total_records_migrated}")
