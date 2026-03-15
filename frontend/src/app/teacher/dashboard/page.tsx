"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, BookOpen, Users, LogOut, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { getMyCourses, createCourse } from "@/lib/api";
import { getStoredAuth, clearStoredAuth } from "@/lib/auth";

interface Course {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  subject: string | null;
  created_at: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, role } = getStoredAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", subject: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user || role !== "teacher") {
      router.push("/auth/login");
      return;
    }
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const res = await getMyCourses();
      setCourses(res.data);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createCourse(form);
      setCourses((c) => [res.data, ...c]);
      setShowModal(false);
      setForm({ name: "", description: "", subject: "" });
      toast.success(`Course created! Join code: ${res.data.join_code}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create course");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900">Nobel</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            My Courses
          </p>
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/teacher/course/${c.id}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            >
              <BookOpen size={16} />
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors w-full"
          >
            <Plus size={16} />
            New course
          </button>
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
              {user?.full_name?.[0] || "T"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400">Teacher</p>
            </div>
          </div>
          <button
            onClick={() => { clearStoredAuth(); router.push("/auth/login"); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 transition-colors w-full rounded-lg hover:bg-red-50"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your courses and view student analytics</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="card p-16 text-center">
            <BookOpen size={40} className="text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No courses yet</h2>
            <p className="text-slate-400 text-sm mb-6">Create your first course to start collecting insights</p>
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Create course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link key={course.id} href={`/teacher/course/${course.id}`}>
                <div className="card p-6 hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                      <BookOpen size={20} className="text-brand-600" />
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                      {course.join_code}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
                    {course.name}
                  </h3>
                  {course.subject && (
                    <p className="text-xs text-slate-400 mb-3 capitalize">{course.subject}</p>
                  )}
                  {course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{course.description}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1 text-xs text-brand-600 font-medium">
                    View analytics →
                  </div>
                </div>
              </Link>
            ))}

            <button
              onClick={() => setShowModal(true)}
              className="card p-6 border-dashed hover:border-brand-300 hover:bg-brand-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-brand-500 min-h-[180px]"
            >
              <Plus size={28} />
              <span className="text-sm font-medium">New course</span>
            </button>
          </div>
        )}
      </main>

      {/* Create course modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create new course</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="label">Course name *</label>
                <input
                  className="input"
                  placeholder="Introduction to Statistics"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Subject</label>
                <input
                  className="input"
                  placeholder="statistics and probability"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none h-20"
                  placeholder="Brief course description…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={creating}>
                  {creating ? "Creating…" : "Create course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
