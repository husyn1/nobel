"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import toast from "react-hot-toast";
import { login } from "@/lib/api";
import { setStoredAuth } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("demo") === "1") {
      setEmail("demo.teacher@nobel.com");
      setPassword("demo1234");
      setRole("teacher");
    }
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email, password, role });
      const { access_token, user } = res.data;
      setStoredAuth(access_token, user, role);
      toast.success(`Welcome back, ${user.full_name}!`);
      router.push(role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Nobel</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Don't have an account?{" "}
            <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <div className="card p-8">
          {/* Role Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            {(["teacher", "student"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
                  role === r ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-2">Demo credentials</p>
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>Teacher: <code className="bg-slate-100 px-1 rounded">demo.teacher@nobel.com</code> / <code className="bg-slate-100 px-1 rounded">demo1234</code></p>
              <p>Student: <code className="bg-slate-100 px-1 rounded">alice.chen@student.edu</code> / <code className="bg-slate-100 px-1 rounded">student123</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
