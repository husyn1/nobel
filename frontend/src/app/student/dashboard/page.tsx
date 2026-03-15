"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Plus, LogOut, Zap, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { getEnrolledCourses, joinCourse } from "@/lib/api";
import { getStoredAuth, clearStoredAuth } from "@/lib/auth";

interface Enrollment {
  id: string;
  course: {
    id: string;
    name: string;
    description: string | null;
    join_code: string;
    subject: string | null;
  };
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, role } = getStoredAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user || role !== "student") {
      router.push("/auth/login");
      return;
    }
    loadEnrollments();
  }, []);

  async function loadEnrollments() {
    try {
      const res = await getEnrolledCourses();
      setEnrollments(res.data);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    try {
      const res = await joinCourse(joinCode.toUpperCase());
      setEnrollments((e) => [...e, res.data]);
      setShowJoin(false);
      setJoinCode("");
      toast.success(`Joined ${res.data.course.name}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid join code");
    } finally {
      setJoining(false);
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
          {enrollments.map((e) => (
            <Link
              key={e.id}
              href={`/student/chat/${e.course.id}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            >
              <BookOpen size={16} />
              <span className="truncate">{e.course.name}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowJoin(true)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors w-full"
          >
            <Plus size={16} /> Join course
          </button>
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
              {user?.full_name?.[0] || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400">Student</p>
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

      {/* Main */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-slate-500 mt-1">Select a course to start a conversation with the AI tutor</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="card p-16 text-center">
            <BookOpen size={40} className="text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No courses yet</h2>
            <p className="text-slate-400 text-sm mb-6">Ask your teacher for a join code to get started</p>
            <button onClick={() => setShowJoin(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Join a course
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((e) => (
              <Link key={e.id} href={`/student/chat/${e.course.id}`}>
                <div className="card p-6 hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                    <MessageSquare size={20} className="text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
                    {e.course.name}
                  </h3>
                  {e.course.subject && (
                    <p className="text-xs text-slate-400 mb-2 capitalize">{e.course.subject}</p>
                  )}
                  {e.course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{e.course.description}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-brand-600 font-medium">
                    Ask the AI tutor →
                  </div>
                </div>
              </Link>
            ))}

            <button
              onClick={() => setShowJoin(true)}
              className="card p-6 border-dashed hover:border-brand-300 hover:bg-brand-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-brand-500 min-h-[160px]"
            >
              <Plus size={28} />
              <span className="text-sm font-medium">Join a course</span>
            </button>
          </div>
        )}
      </main>

      {/* Join modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Join a course</h2>
            <p className="text-sm text-slate-500 mb-6">Enter the join code your teacher gave you</p>
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                className="input text-center text-xl font-mono font-bold uppercase tracking-widest"
                placeholder="STAT256"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={16}
                required
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={joining}>
                  {joining ? "Joining…" : "Join course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
