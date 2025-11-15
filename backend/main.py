from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

# ルーター
from routers import auth, recipes, timers, fashion, home, upload

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 アプリケーション起動")
    yield
    print("🛑 アプリケーション終了")

app = FastAPI(
    title="My App API",
    description="個人用趣味アプリケーション",
    version="0.1.0",
    lifespan=lifespan
)

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
app.include_router(fashion.router, prefix="/api/fashion", tags=["fashion"])
app.include_router(home.router, prefix="/api/home", tags=["home"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

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
