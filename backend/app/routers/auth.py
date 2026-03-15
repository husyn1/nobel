from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token
from app.database import get_db
from app.models.user import Student, Teacher
from app.schemas.user import LoginRequest, StudentCreate, TeacherCreate, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


@router.post("/register/teacher", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_teacher(body: TeacherCreate, db: Session = Depends(get_db)):
    if db.query(Teacher).filter(Teacher.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    teacher = Teacher(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    token = create_access_token({"sub": str(teacher.id), "role": "teacher"})
    return TokenResponse(
        access_token=token,
        role="teacher",
        user={"id": str(teacher.id), "email": teacher.email, "full_name": teacher.full_name},
    )


@router.post("/register/student", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_student(body: StudentCreate, db: Session = Depends(get_db)):
    if db.query(Student).filter(Student.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    student = Student(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    token = create_access_token({"sub": str(student.id), "role": "student"})
    return TokenResponse(
        access_token=token,
        role="student",
        user={"id": str(student.id), "email": student.email, "full_name": student.full_name},
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    if body.role == "teacher":
        user = db.query(Teacher).filter(Teacher.email == body.email).first()
    elif body.role == "student":
        user = db.query(Student).filter(Student.email == body.email).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role. Use 'teacher' or 'student'")

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": body.role})
    return TokenResponse(
        access_token=token,
        role=body.role,
        user={"id": str(user.id), "email": user.email, "full_name": user.full_name},
    )
