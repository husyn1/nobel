# Nobel — AI Learning Analytics Platform

> Turn AI tutoring conversations into actionable teaching insights.

Students ask questions to an AI tutor. Nobel silently analyzes every message and delivers real-time class-level analytics to teachers — confusion scores, intent breakdowns, trending topics, and natural language teaching recommendations.

---

## Quick Start (Docker)

### 1. Clone and configure

```bash
cd backend
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY (optional, fallback works without it)
```

### 2. Start everything

```bash
docker-compose up --build
```

### 3. Seed demo data (separate terminal)

```bash
docker-compose run --rm seed
```

### 4. Open the app

| Service    | URL                      |
|------------|--------------------------|
| Frontend   | http://localhost:3000    |
| Backend API| http://localhost:8000    |
| API Docs   | http://localhost:8000/docs |

---

## Demo credentials

| Role    | Email                             | Password    |
|---------|-----------------------------------|-------------|
| Teacher | demo.teacher@nobel.com     | demo1234    |
| Student | alice.chen@student.edu            | student123  |

**Course join code:** `STAT256`

The demo contains 20 students, 200+ analyzed conversations, and a full two-week history for the Introduction to Statistics course.

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Set env vars
export DATABASE_URL=postgresql://user:pass@localhost:5432/nobel
export SECRET_KEY=your-secret-key
export OPENAI_API_KEY=sk-...  # optional

uvicorn app.main:app --reload
```

### Seed demo data

```bash
cd backend
python seed_demo.py
```

### Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Architecture

```
Students
   │
   ▼
AI Chat Interface (Next.js)
   │
   ▼
FastAPI Backend
   │
   ├── Store conversations (PostgreSQL)
   │
   ├── AI Analysis Pipeline (OpenAI gpt-4o-mini)
   │   ├── primary_topic / subtopic
   │   ├── confusion_score (0–1)
   │   ├── frustration_score (0–1)
   │   ├── intent_type (concept_explanation | homework_help | ...)
   │   └── direct_answer_request_likelihood
   │
   └── Analytics Engine
           │
           ▼
   Teacher Dashboard (Next.js + Recharts)
   ├── Overview cards
   ├── Top confusing topics (bar chart)
   ├── Question intent breakdown (pie chart)
   ├── Confusion trend (line chart)
   ├── Anonymized sample questions
   └── AI-generated teaching insight
```

---

## API Endpoints

### Auth
- `POST /auth/register/teacher` — Register a teacher
- `POST /auth/register/student` — Register a student
- `POST /auth/login` — Login (role: teacher | student)

### Courses
- `POST /courses/` — Create course (teacher)
- `GET /courses/` — List my courses (teacher)
- `POST /courses/join` — Join course with code (student)
- `GET /courses/student/enrolled` — My enrollments (student)

### Chat
- `POST /chat/{course_id}` — Send message, get AI reply + analysis
- `GET /chat/{course_id}/conversations` — List conversations (student)

### Analytics
- `GET /analytics/{course_id}` — Full course analytics (teacher)

---

## Stack

**Backend:** FastAPI · PostgreSQL · SQLAlchemy · JWT auth · OpenAI API

**Frontend:** Next.js 14 · Tailwind CSS · Recharts · TypeScript

**Infrastructure:** Docker · Docker Compose

---

## Phase 2 Roadmap

- [ ] LMS integration (Canvas, Blackboard, Moodle)
- [ ] Assignment-level confusion detection
- [ ] Early warning system for struggling students
- [ ] Student learning trajectory graphs
- [ ] Department-level dashboards across courses
- [ ] Webhook support for real-time alerts to Slack/email
