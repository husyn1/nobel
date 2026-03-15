from datetime import datetime

from pydantic import BaseModel


class CourseCreate(BaseModel):
    name: str
    description: str | None = None
    subject: str | None = None


class CourseOut(BaseModel):
    id: str
    name: str
    description: str | None
    join_code: str
    subject: str | None
    teacher_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CourseJoin(BaseModel):
    join_code: str


class EnrollmentOut(BaseModel):
    id: str
    course_id: str
    student_id: str
    enrolled_at: datetime
    course: CourseOut

    model_config = {"from_attributes": True}
