from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_teacher
from app.database import get_db
from app.models.course import Course
from app.models.user import Teacher
from app.schemas.analytics import CourseAnalytics
from app.services.analytics import get_course_analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/{course_id}", response_model=CourseAnalytics)
def course_analytics(
    course_id: str,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.teacher_id == teacher.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    return get_course_analytics(db, course.id)
