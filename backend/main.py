from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from jose import JWTError, jwt

# データベース初期化
import database

# ルーター
from routers import auth, recipes, timers, fashion, home, upload, settings, records, pomodoro, todos

# 認証設定
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production-123456789")
ALGORITHM = "HS256"

# 認証不要なパス
PUBLIC_PATHS = [
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/api/auth/login",
    "/uploads",  # 静的ファイル
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 アプリケーション起動")
    print("✅ Cosmos DB 初期化完了")
    yield
    print("🛑 アプリケーション終了")

app = FastAPI(
    title="My App API",
    description="個人用趣味アプリケーション",
    version="0.1.0",
    lifespan=lifespan
)

# 認証ミドルウェア
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """全リクエストで認証チェック"""
    # 公開パスはスキップ
    if any(request.url.path.startswith(path) for path in PUBLIC_PATHS):
        return await call_next(request)
    
    # Authorizationヘッダーをチェック
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "認証が必要です"},
        )
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise JWTError()
    except JWTError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "無効なトークンです"},
        )
    
    return await call_next(request)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
app.include_router(timers.router, prefix="/api/timers", tags=["timers"])
app.include_router(pomodoro.router, prefix="/api/pomodoro", tags=["pomodoro"])
app.include_router(todos.router, prefix="/api", tags=["todos"])
app.include_router(records.router)
app.include_router(fashion.router, prefix="/api/fashion", tags=["fashion"])
app.include_router(home.router, prefix="/api/home", tags=["home"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

# 画像保存用ディレクトリ
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 静的ファイル配信
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
async def root():
    return {"message": "My App API Running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
