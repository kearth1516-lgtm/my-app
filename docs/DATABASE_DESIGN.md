# データベース設計書

## コレクション設計（Cosmos DB）

### 1. users
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "createdAt": "2024-01-01T00:00:00Z",
  "preferences": {
    "theme": "dark",
    "language": "ja"
  }
}
```

### 2. recipes
```json
{
  "id": "recipe-uuid",
  "userId": "user-uuid",
  "name": "カレー",
  "ingredients": ["玉ねぎ", "人参"],
  "cookingTime": 30,
  "source": "https://example.com/recipe",
  "tags": ["カレー", "簡単"],
  "isFavorite": true,
  "timesCooked": 5,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 3. timers
```json
{
  "id": "timer-uuid",
  "userId": "user-uuid",
  "name": "勉強タイマー",
  "duration": 3600,
  "imageUrl": "https://...",
  "records": [
    {
      "startTime": "2024-01-01T10:00:00Z",
      "endTime": "2024-01-01T11:00:00Z"
    }
  ]
}
```

### 4. fashion_items
```json
{
  "id": "item-uuid",
  "userId": "user-uuid",
  "imageUrl": "https://...",
  "category": "top",
  "color": "blue",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 5. daily_outfits
```json
{
  "id": "outfit-uuid",
  "userId": "user-uuid",
  "date": "2024-01-01",
  "items": ["item-uuid-1", "item-uuid-2"],
  "weather": "sunny"
}
```

## インデックス戦略

- `userId`: すべてのクエリの高速化
- `createdAt`: 時系列検索用
- `tags`: レシピ検索用