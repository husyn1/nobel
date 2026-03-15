"""
Demo data seed script.
Creates: 1 teacher, 20 students, 1 course (STAT256), 200+ student messages with pre-built analysis.
Run: python seed_demo.py
"""

import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, ".")

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.analysis import AIAnalysis
from app.models.conversation import Conversation, Message
from app.models.course import Course, CourseEnrollment
from app.models.user import Student, Teacher

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# Realistic demo messages for a statistics course
# ---------------------------------------------------------------------------
DEMO_QUESTIONS = [
    # Bayes theorem — high confusion
    ("Why does P(A|B) not equal P(B|A)?", "probability", "bayes_theorem", 0.82, 0.3, "concept_explanation", "conceptual", 0.05, 0.1),
    ("I don't understand why we multiply the prior by the likelihood", "probability", "bayes_theorem", 0.78, 0.4, "concept_explanation", "conceptual", 0.1, 0.2),
    ("Can you just give me the answer to question 4 about Bayes theorem?", "probability", "bayes_theorem", 0.45, 0.5, "direct_answer_request", "procedural", 0.92, 0.8),
    ("What even is a posterior distribution?", "probability", "bayes_theorem", 0.75, 0.2, "concept_explanation", "conceptual", 0.05, 0.1),
    ("Why can't I just swap the probabilities?", "probability", "bayes_theorem", 0.80, 0.35, "concept_explanation", "conceptual", 0.1, 0.1),
    ("Show me an example of Bayes theorem with actual numbers", "probability", "bayes_theorem", 0.6, 0.2, "example_request", "procedural", 0.1, 0.2),
    ("I have an exam tomorrow, what are the key Bayes theorem formulas?", "probability", "bayes_theorem", 0.5, 0.6, "test_preparation", "both", 0.3, 0.4),
    ("The homework says use Bayes but I don't know where to start", "probability", "bayes_theorem", 0.7, 0.55, "homework_help", "procedural", 0.4, 0.9),
    ("Is the prior always uniform?", "probability", "bayes_theorem", 0.65, 0.1, "concept_explanation", "conceptual", 0.1, 0.1),
    ("Can you explain what updating beliefs means in Bayes theorem?", "probability", "bayes_theorem", 0.72, 0.15, "concept_explanation", "conceptual", 0.05, 0.1),

    # Hypothesis testing — moderate confusion
    ("What's the difference between null and alternative hypothesis?", "statistics", "hypothesis_testing", 0.65, 0.2, "concept_explanation", "conceptual", 0.05, 0.1),
    ("Why do we reject when p-value < 0.05 and not 0.1?", "statistics", "hypothesis_testing", 0.68, 0.3, "concept_explanation", "conceptual", 0.05, 0.1),
    ("Give me the answer to the t-test problem on the worksheet", "statistics", "hypothesis_testing", 0.4, 0.6, "direct_answer_request", "procedural", 0.95, 0.85),
    ("Is a lower p-value always better?", "statistics", "hypothesis_testing", 0.6, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),
    ("I keep getting confused between Type I and Type II errors", "statistics", "hypothesis_testing", 0.72, 0.4, "concept_explanation", "conceptual", 0.1, 0.1),
    ("What is statistical power?", "statistics", "hypothesis_testing", 0.55, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),
    ("Show me a complete example of a two-sample t-test", "statistics", "hypothesis_testing", 0.5, 0.2, "example_request", "procedural", 0.15, 0.3),
    ("For my assignment, I need to test if the means are different. What test?", "statistics", "hypothesis_testing", 0.45, 0.3, "homework_help", "procedural", 0.3, 0.8),
    ("Can a test be significant but not meaningful?", "statistics", "hypothesis_testing", 0.58, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),
    ("What's a confidence interval actually telling me?", "statistics", "confidence_intervals", 0.65, 0.2, "concept_explanation", "conceptual", 0.05, 0.1),

    # Confidence intervals
    ("Why is a 95% confidence interval not a 95% probability the true value is inside?", "statistics", "confidence_intervals", 0.75, 0.25, "concept_explanation", "conceptual", 0.05, 0.1),
    ("How wide should a confidence interval be?", "statistics", "confidence_intervals", 0.5, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),
    ("I need to find the 90% confidence interval for this homework problem", "statistics", "confidence_intervals", 0.4, 0.4, "homework_help", "procedural", 0.35, 0.9),
    ("Show me step by step how to calculate a confidence interval", "statistics", "confidence_intervals", 0.6, 0.2, "example_request", "procedural", 0.1, 0.3),
    ("Does sample size affect confidence interval width?", "statistics", "confidence_intervals", 0.45, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),

    # Conditional probability
    ("What does P(A|B) actually mean in plain English?", "probability", "conditional_probability", 0.55, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),
    ("Are mutually exclusive and independent the same?", "probability", "conditional_probability", 0.7, 0.25, "concept_explanation", "conceptual", 0.05, 0.1),
    ("Give me the answer to question 7 about conditional probability", "probability", "conditional_probability", 0.35, 0.55, "direct_answer_request", "procedural", 0.93, 0.82),
    ("I'm so confused about the multiplication rule vs addition rule", "probability", "conditional_probability", 0.8, 0.5, "concept_explanation", "conceptual", 0.1, 0.1),
    ("What does it mean for events to be independent?", "probability", "conditional_probability", 0.5, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),

    # Normal distribution
    ("Why is the normal distribution bell-shaped?", "statistics", "normal_distribution", 0.45, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),
    ("What is the 68-95-99.7 rule?", "statistics", "normal_distribution", 0.4, 0.1, "concept_explanation", "conceptual", 0.05, 0.1),
    ("How do I standardize to get a z-score?", "statistics", "normal_distribution", 0.5, 0.2, "concept_explanation", "both", 0.1, 0.2),
    ("I have a normal distribution problem on my homework — can you solve it?", "statistics", "normal_distribution", 0.3, 0.45, "direct_answer_request", "procedural", 0.88, 0.75),
    ("What's the difference between normal and standard normal?", "statistics", "normal_distribution", 0.55, 0.15, "concept_explanation", "conceptual", 0.05, 0.1),

    # General / mixed
    ("I'm completely lost in this course", "statistics", "general", 0.9, 0.8, "general", "unclear", 0.2, 0.3),
    ("Can you summarize everything we've covered for the exam?", "statistics", "general", 0.5, 0.5, "test_preparation", "both", 0.3, 0.4),
    ("What topics should I focus on for the midterm?", "statistics", "general", 0.45, 0.4, "test_preparation", "both", 0.2, 0.3),
    ("I keep mixing up correlation and causation", "statistics", "correlation", 0.6, 0.3, "concept_explanation", "conceptual", 0.05, 0.1),
    ("Show me an example of a real-world application of statistics", "statistics", "applications", 0.3, 0.1, "example_request", "conceptual", 0.05, 0.1),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    print("🌱 Seeding demo data...")

    # --- Teacher ---
    teacher = db.query(Teacher).filter(Teacher.email == "demo.teacher@nobel.com").first()
    if not teacher:
        teacher = Teacher(
            email="demo.teacher@nobel.com",
            full_name="Dr. Sarah Mitchell",
            hashed_password=pwd_context.hash("demo1234"),
        )
        db.add(teacher)
        db.flush()
        print("  ✓ Created teacher: demo.teacher@nobel.com / demo1234")
    else:
        print("  → Teacher already exists, skipping")

    # --- Course ---
    course = db.query(Course).filter(Course.join_code == "STAT256").first()
    if not course:
        course = Course(
            name="Introduction to Statistics",
            description="Probability theory, hypothesis testing, and statistical inference",
            subject="statistics and probability",
            join_code="STAT256",
            teacher_id=teacher.id,
        )
        db.add(course)
        db.flush()
        print("  ✓ Created course: Introduction to Statistics (STAT256)")
    else:
        print("  → Course already exists, skipping")

    # --- Students ---
    student_names = [
        ("Alice Chen", "alice.chen"), ("Bob Patel", "bob.patel"), ("Carol Kim", "carol.kim"),
        ("David Osei", "david.osei"), ("Emma Gonzalez", "emma.gonzalez"), ("Finn Murphy", "finn.murphy"),
        ("Grace Liu", "grace.liu"), ("Hassan Al-Amin", "hassan.alamin"), ("Isla Brown", "isla.brown"),
        ("James Taylor", "james.taylor"), ("Kai Nakamura", "kai.nakamura"), ("Lena Fischer", "lena.fischer"),
        ("Marco Rossi", "marco.rossi"), ("Nadia Petrov", "nadia.petrov"), ("Omar Diallo", "omar.diallo"),
        ("Priya Singh", "priya.singh"), ("Quinn Walsh", "quinn.walsh"), ("Rania Hassan", "rania.hassan"),
        ("Sam Okafor", "sam.okafor"), ("Talia Mendes", "talia.mendes"),
    ]

    students = []
    for full_name, username in student_names:
        email = f"{username}@student.edu"
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            student = Student(
                email=email,
                full_name=full_name,
                hashed_password=pwd_context.hash("student123"),
            )
            db.add(student)
            db.flush()

        # Enroll if not already
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.student_id == student.id,
        ).first()
        if not enrollment:
            db.add(CourseEnrollment(course_id=course.id, student_id=student.id))

        students.append(student)

    db.flush()
    print(f"  ✓ Created/verified {len(students)} students")

    # Check if messages already exist
    existing_msg_count = (
        db.query(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.course_id == course.id)
        .count()
    )
    if existing_msg_count > 0:
        print(f"  → {existing_msg_count} messages already exist, skipping message generation")
        db.commit()
        db.close()
        print("\n✅ Seed complete!")
        print(f"\n   Teacher login:  demo.teacher@nobel.com / demo1234")
        print(f"   Student login:  alice.chen@student.edu / student123")
        print(f"   Course join code: STAT256")
        return

    # --- Conversations + Messages ---
    base_date = datetime.utcnow() - timedelta(days=14)
    message_count = 0

    for student in students:
        # Each student has 2–4 conversations over the past 2 weeks
        num_convs = random.randint(2, 4)
        for conv_idx in range(num_convs):
            days_ago = random.randint(0, 13)
            conv_date = base_date + timedelta(days=days_ago, hours=random.randint(8, 22))

            # Pick 2–6 questions per conversation
            questions = random.sample(DEMO_QUESTIONS, k=random.randint(2, 6))
            first_q = questions[0]

            conversation = Conversation(
                course_id=course.id,
                student_id=student.id,
                title=first_q[0][:60],
                created_at=conv_date,
                updated_at=conv_date,
            )
            db.add(conversation)
            db.flush()

            for q_idx, (
                content, topic, subtopic, confusion, frustration,
                intent, conceptual_proc, direct_likelihood, hw_likelihood
            ) in enumerate(questions):
                msg_time = conv_date + timedelta(minutes=q_idx * random.randint(2, 8))

                # Student message
                msg = Message(
                    conversation_id=conversation.id,
                    role="student",
                    content=content,
                    created_at=msg_time,
                )
                db.add(msg)
                db.flush()

                # Analysis — add slight random variation
                analysis = AIAnalysis(
                    message_id=msg.id,
                    primary_topic=topic,
                    subtopic=subtopic,
                    confusion_score=min(1.0, max(0.0, confusion + random.uniform(-0.1, 0.1))),
                    frustration_score=min(1.0, max(0.0, frustration + random.uniform(-0.1, 0.1))),
                    intent_type=intent,
                    conceptual_vs_procedural=conceptual_proc,
                    direct_answer_request_likelihood=direct_likelihood,
                    homework_help_likelihood=hw_likelihood,
                    created_at=msg_time,
                )
                db.add(analysis)

                # AI reply (short placeholder)
                ai_reply = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=f"Great question! Let me help you understand {subtopic.replace('_', ' ')}...",
                    created_at=msg_time + timedelta(seconds=3),
                )
                db.add(ai_reply)
                message_count += 2

    db.commit()
    db.close()

    print(f"  ✓ Created {message_count} messages across all conversations")
    print("\n✅ Seed complete!")
    print(f"\n   Teacher login:  demo.teacher@nobel.com / demo1234")
    print(f"   Student login:  alice.chen@student.edu / student123")
    print(f"   Course join code: STAT256")


if __name__ == "__main__":
    seed()
