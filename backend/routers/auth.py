from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
async def register(request: RegisterRequest):
    """ユーザー登録"""
    # TODO: 実装
    return {"message": "User registered successfully", "email": request.email}

@router.post("/login")
async def login(request: LoginRequest):
    """ログイン"""
    # TODO: 実装
    return {"access_token": "dummy_token", "token_type": "bearer"}
