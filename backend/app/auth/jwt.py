from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import Student, Teacher  # noqa: F401

bearer_scheme = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Teacher:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    teacher = db.query(Teacher).filter(Teacher.id == payload["sub"]).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Student:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    student = db.query(Student).filter(Student.id == payload["sub"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> tuple:
    """Returns (user, role) for either teacher or student."""
    payload = decode_token(credentials.credentials)
    role = payload.get("role")
    if role == "teacher":
        user = db.query(Teacher).filter(Teacher.id == payload["sub"]).first()
    elif role == "student":
        user = db.query(Student).filter(Student.id == payload["sub"]).first()
    else:
        raise HTTPException(status_code=403, detail="Invalid role")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user, role
