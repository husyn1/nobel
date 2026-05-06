import axios from "axios";

/**
 * Never fall back to localhost in production — that bakes a broken API URL into the client bundle.
 */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (raw) return raw;
  if (process.env.NODE_ENV === "production") {
    // Deliberately invalid host so failures are obvious in Network tab (not silent same-origin 404).
    return "https://__MISSING_NEXT_PUBLIC_API_URL__.invalid";
  }
  return "http://localhost:8000";
}

const API_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ic_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.code === "ECONNABORTED") {
      err.response = {
        data: {
          detail:
            "Request timed out. Backend may be waking up (free Render) or unavailable. Try again in a few seconds.",
        },
      };
    } else if (!err.response) {
      err.response = {
        data: {
          detail:
            "Cannot reach backend API. Check NEXT_PUBLIC_API_URL and backend status.",
        },
      };
    }
    if (err.response?.status === 401) {
      localStorage.removeItem("ic_token");
      localStorage.removeItem("ic_user");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const registerTeacher = (data: { email: string; full_name: string; password: string }) =>
  api.post("/auth/register/teacher", data);

export const registerStudent = (data: { email: string; full_name: string; password: string }) =>
  api.post("/auth/register/student", data);

export const login = (data: { email: string; password: string; role: string }) =>
  api.post("/auth/login", data);

// Courses
export const createCourse = (data: { name: string; description?: string; subject?: string }) =>
  api.post("/courses/", data);

export const getMyCourses = () => api.get("/courses/");

export const getCourse = (id: string) => api.get(`/courses/${id}`);

export const joinCourse = (join_code: string) => api.post("/courses/join", { join_code });

export const getEnrolledCourses = () => api.get("/courses/student/enrolled");

// Chat
export const sendMessage = (courseId: string, message: string, conversationId?: string) =>
  api.post(`/chat/${courseId}`, { message, conversation_id: conversationId });

export const getConversations = (courseId: string) =>
  api.get(`/chat/${courseId}/conversations`);

// Analytics
export const getCourseAnalytics = (courseId: string) =>
  api.get(`/analytics/${courseId}`);
