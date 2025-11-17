# Azure App Service デプロイ手順

## 📋 前提条件
- Azure アカウント（無料アカウント可）
- Azure CLI インストール済み
- Git リポジトリ準備済み

## 🚀 デプロイ手順

### 1. Azure CLIでログイン
```bash
az login
```

### 2. リソースグループ作成
```bash
az group create --name my-app-rg --location japaneast
```

### 3. App Serviceプラン作成（Free F1）
```bash
az appservice plan create \
  --name my-app-plan \
  --resource-group my-app-rg \
  --sku F1 \
  --is-linux
```

**または Basic B1（推奨: RAG機能なしでも安定動作）**
```bash
az appservice plan create \
  --name my-app-plan \
  --resource-group my-app-rg \
  --sku B1 \
  --is-linux
```

### 4. バックエンド（FastAPI）デプロイ
```bash
# Web Appを作成
az webapp create \
  --resource-group my-app-rg \
  --plan my-app-plan \
  --name my-app-backend-1516 \
  --runtime "PYTHON:3.12" \
  --deployment-local-git

# デプロイ認証情報を設定
az webapp deployment user set \
  --user-name <username> \
  --password <password>

# Gitリモートを追加
cd backend
git init
git remote add azure <git-url>

# デプロイ
git add .
git commit -m "Initial deployment"
git push azure main
```

### 5. 環境変数設定
```bash
az webapp config appsettings set \
  --resource-group my-app-rg \
  --name my-app-backend-1516 \
  --settings \
    COSMOS_ENDPOINT="<your-cosmos-endpoint>" \
    COSMOS_KEY="<your-cosmos-key>" \
    COSMOS_DATABASE_NAME="my-app-db" \
    JWT_SECRET_KEY="<generate-random-secret-key>" \
    APP_USERNAME="admin" \
    APP_PASSWORD="<your-secure-password>"
```

**JWT秘密鍵の生成:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 6. フロントエンド（React）デプロイ - Static Web Apps
```bash
# Static Web App作成
az staticwebapp create \
  --name my-app-frontend \
  --resource-group my-app-rg \
  --source https://github.com/<your-username>/my-app \
  --branch main \
  --app-location "/frontend" \
  --output-location "dist" \
  --login-with-github

# または手動ビルド＆デプロイ
cd frontend
npm run build

# Azure Storageにデプロイ（別の方法）
az storage account create \
  --name myappfrontendstorage \
  --resource-group my-app-rg \
  --location japaneast \
  --sku Standard_LRS

az storage blob service-properties update \
  --account-name myappfrontendstorage \
  --static-website \
  --index-document index.html

az storage blob upload-batch \
  --account-name myappfrontendstorage \
  --destination '$web' \
  --source ./dist
```

### 7. CORS設定（バックエンド）
```bash
az webapp cors add \
  --resource-group my-app-rg \
  --name my-app-backend-1516 \
  --allowed-origins \
    "https://<your-frontend-url>.azurestaticapps.net" \
    "https://<your-storage-account>.z11.web.core.windows.net"
```

### 8. カスタムドメイン設定（オプション）
```bash
# DNSレコード追加後
az webapp config hostname add \
  --webapp-name my-app-backend-1516 \
  --resource-group my-app-rg \
  --hostname <your-domain.com>

# HTTPS証明書（無料）
az webapp config ssl create \
  --resource-group my-app-rg \
  --name my-app-backend-1516 \
  --hostname <your-domain.com>
```

## 📱 スマホからのアクセス

### 方法1: Azure提供のURL
- バックエンド: `https://my-app-backend-1516.azurewebsites.net`
- フロントエンド: `https://my-app-frontend.azurestaticapps.net`

### 方法2: カスタムドメイン
- 独自ドメインを設定すればより短いURLでアクセス可能

## 🔒 本番環境のセキュリティ

1. **環境変数を必ず設定:**
   - `JWT_SECRET_KEY`: 32文字以上のランダム文字列
   - `APP_PASSWORD`: 強力なパスワード（12文字以上推奨）

2. **HTTPS強制:**
   ```bash
   az webapp update \
     --resource-group my-app-rg \
     --name my-app-backend-1516 \
     --set httpsOnly=true
   ```

3. **IP制限（オプション）:**
   特定のIPからのみアクセス許可する場合
   ```bash
   az webapp config access-restriction add \
     --resource-group my-app-rg \
     --name my-app-backend-1516 \
     --rule-name "Allow Home IP" \
     --action Allow \
     --ip-address <your-ip>/32 \
     --priority 100
   ```

## 💰 コスト管理

### Free F1プランの制限
- CPU: 60分/日
- メモリ: 1GB
- ストレージ: 1GB
- スリープ機能あり（20分無通信で休止）
- カスタムドメイン不可

### Basic B1プラン（推奨）
- 月額: 約¥1,500
- CPU: 100分/日
- メモリ: 1.75GB
- 常時起動
- カスタムドメイン対応

### コスト削減のコツ
1. **Cosmos DBはサーバーレスモード:** 使った分だけ課金
2. **不要な時は停止:**
   ```bash
   az webapp stop --resource-group my-app-rg --name my-app-backend-1516
   ```
3. **アラート設定:** 予算超過時に通知

## 🔧 トラブルシューティング

### ログ確認
```bash
# リアルタイムログ
az webapp log tail \
  --resource-group my-app-rg \
  --name my-app-backend-1516

# ログダウンロード
az webapp log download \
  --resource-group my-app-rg \
  --name my-app-backend-1516 \
  --log-file logs.zip
```

### デプロイ失敗時
```bash
# デプロイ履歴確認
az webapp deployment list \
  --resource-group my-app-rg \
  --name my-app-backend-1516

# 再起動
az webapp restart \
  --resource-group my-app-rg \
  --name my-app-backend-1516
```

## 📚 参考リンク
- [Azure App Service 公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/app-service/)
- [Azure Static Web Apps 公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/static-web-apps/)
- [Azure Cosmos DB 公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/cosmos-db/)
