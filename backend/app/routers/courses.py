import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_student, get_current_teacher
from app.database import get_db
from app.models.course import Course, CourseEnrollment
from app.models.user import Student, Teacher
from app.schemas.course import CourseCreate, CourseJoin, CourseOut, EnrollmentOut

router = APIRouter(prefix="/courses", tags=["courses"])


def generate_join_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    # Ensure unique join code
    for _ in range(10):
        code = generate_join_code()
        if not db.query(Course).filter(Course.join_code == code).first():
            break

    course = Course(
        name=body.name,
        description=body.description,
        subject=body.subject,
        join_code=code,
        teacher_id=teacher.id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/", response_model=list[CourseOut])
def list_my_courses(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return db.query(Course).filter(Course.teacher_id == teacher.id).all()


@router.get("/{course_id}", response_model=CourseOut)
def get_course(
    course_id: str,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.teacher_id == teacher.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/join", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def join_course(
    body: CourseJoin,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.join_code == body.join_code.upper()).first()
    if not course:
        raise HTTPException(status_code=404, detail="Invalid join code")

    existing = (
        db.query(CourseEnrollment)
        .filter(CourseEnrollment.course_id == course.id, CourseEnrollment.student_id == student.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")

    enrollment = CourseEnrollment(course_id=course.id, student_id=student.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/student/enrolled", response_model=list[EnrollmentOut])
def list_enrolled_courses(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return (
        db.query(CourseEnrollment)
        .filter(CourseEnrollment.student_id == student.id)
        .all()
    )
