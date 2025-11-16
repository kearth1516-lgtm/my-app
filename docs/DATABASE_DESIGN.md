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
  "name": "勉強タイマー",
  "duration": 3600,
  "image": "https://...",
  "type": "countdown",
  "order": 0,
  "isFavorite": false
}
```

### 4. records
```json
{
  "id": "record-uuid",
  "timerId": "timer-uuid",
  "timerName": "勉強タイマー",
  "startTime": "2024-01-01T10:00:00Z",
  "endTime": "2024-01-01T11:00:00Z",
  "duration": 3600,
  "date": "2024-01-01",
  "tag": "数学",
  "stamp": "📚"
}
```

### 5. tags
```json
{
  "id": "tag-uuid",
  "name": "数学",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 6. fashion_items
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

### 7. daily_outfits
```json
{
  "id": "outfit-uuid",
  "userId": "user-uuid",
  "date": "2024-01-01",
  "items": ["item-uuid-1", "item-uuid-2"],
  "weather": "sunny"
}
```

### 8. settings
```json
{
  "id": "settings-fixed",
  "theme": "dark",
  "soundEnabled": true,
  "soundVolume": 0.5,
  "soundType": "beep"
}
```

**フィールド説明:**
- `id`: 固定値 "settings-fixed"
- `theme`: テーマカラー（red, blue, yellow, green, pink, cyan, orange, lime, purple, black, white, brown）
- `soundEnabled`: アラート音の有効/無効（boolean）
- `soundVolume`: 音量（0.0-1.0）
- `soundType`: 音の種類（beep, bell, chime, digital）

## インデックス戦略

- `timerId`: records検索用
- `date`: 日付範囲検索用
- `tag`: タグフィルタリング用
- `order`: タイマー並び順
- `createdAt`: 時系列検索用
- `tags`: レシピ検索用