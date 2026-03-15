from datetime import datetime

from pydantic import BaseModel, EmailStr


class TeacherCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class StudentCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class TeacherOut(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentOut(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: dict
