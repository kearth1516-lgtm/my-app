# API設計書

## ベースURL
```
http://localhost:8000/api
```

## 認証
JWT トークンベース（Bearer Token）

## エンドポイント一覧

### ユーザー関連
- `POST /auth/register` - ユーザー登録
- `POST /auth/login` - ログイン
- `GET /users/me` - プロフィール取得

### レシピ関連
- `GET /recipes` - レシピ一覧（フィルター対応）
- `POST /recipes` - レシピ作成
- `GET /recipes/{id}` - レシピ詳細取得
- `PUT /recipes/{id}` - レシピ更新
- `DELETE /recipes/{id}` - レシピ削除
- `POST /recipes/{id}/cook` - 調理記録

### タイマー関連
- `GET /timers` - タイマー一覧
- `POST /timers` - タイマー作成
- `POST /timers/{id}/start` - タイマー開始
- `POST /timers/{id}/stop` - タイマー停止
- `GET /timers/{id}/records` - 記録一覧

### ファッション関連
- `GET /fashion/items` - アイテム一覧
- `POST /fashion/items` - アイテム登録
- `GET /fashion/outfits` - コーディネート履歴
- `POST /fashion/outfits` - コーディネート記録

### ホーム画面
- `GET /home/images` - ランダム推し写真取得
- `POST /home/images` - 写真登録