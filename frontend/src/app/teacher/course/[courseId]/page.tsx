"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  ArrowLeft, Users, MessageSquare, AlertTriangle, TrendingUp,
  Brain, Zap, BookOpen, Copy, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { getCourse, getCourseAnalytics } from "@/lib/api";
import { getStoredAuth } from "@/lib/auth";

interface Analytics {
  overview: {
    total_questions: number;
    avg_confusion: number;
    direct_answer_pct: number;
    active_students: number;
    total_conversations: number;
  };
  top_confusing_topics: Array<{
    topic: string;
    subtopic: string | null;
    avg_confusion: number;
    question_count: number;
  }>;
  intent_breakdown: {
    concept_explanation: number;
    example_request: number;
    homework_help: number;
    direct_answer_request: number;
    test_preparation: number;
    general: number;
  };
  confusion_trend: Array<{ date: string; avg_confusion: number; question_count: number }>;
  sample_questions: Array<{
    content: string;
    topic: string | null;
    subtopic: string | null;
    intent_type: string | null;
  }>;
  insight_summary: string;
}

const INTENT_COLORS: Record<string, string> = {
  concept_explanation: "#3563f5",
  homework_help: "#8b5cf6",
  direct_answer_request: "#ef4444",
  example_request: "#10b981",
  test_preparation: "#f59e0b",
  general: "#94a3b8",
};

const INTENT_LABELS: Record<string, string> = {
  concept_explanation: "Concept explanation",
  homework_help: "Homework help",
  direct_answer_request: "Direct answer request",
  example_request: "Example request",
  test_preparation: "Test preparation",
  general: "General",
};

function confusionColor(score: number) {
  if (score >= 0.7) return "text-red-600 bg-red-50";
  if (score >= 0.5) return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}

function confusionBar(score: number) {
  if (score >= 0.7) return "bg-red-500";
  if (score >= 0.5) return "bg-amber-500";
  return "bg-green-500";
}

export default function CourseAnalyticsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { user, role } = getStoredAuth();

  const [course, setCourse] = useState<any>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || role !== "teacher") {
      router.push("/auth/login");
      return;
    }
    loadData();
  }, [courseId]);

  async function loadData() {
    setLoading(true);
    try {
      const [courseRes, analyticsRes] = await Promise.all([
        getCourse(courseId),
        getCourseAnalytics(courseId),
      ]);
      setCourse(courseRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function copyJoinCode() {
    if (course?.join_code) {
      navigator.clipboard.writeText(course.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Join code copied!");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { overview, top_confusing_topics, intent_breakdown, confusion_trend, sample_questions, insight_summary } = analytics;

  const intentData = Object.entries(intent_breakdown)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: INTENT_LABELS[key] || key, value, color: INTENT_COLORS[key] }));

  const topicBarData = top_confusing_topics.slice(0, 6).map((t) => ({
    name: t.subtopic?.replace(/_/g, " ") || t.topic,
    confusion: Math.round(t.avg_confusion * 100),
    questions: t.question_count,
  }));

  const trendData = confusion_trend.map((d) => ({
    date: d.date.slice(5),
    confusion: Math.round(d.avg_confusion * 100),
    questions: d.question_count,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teacher/dashboard" className="text-slate-400 hover:text-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="font-bold text-slate-900">Nobel</span>
            </div>
            <span className="text-slate-300">/</span>
            <h1 className="font-semibold text-slate-900">{course?.name}</h1>
          </div>
          <button
            onClick={copyJoinCode}
            className="flex items-center gap-2 text-sm font-mono font-bold bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 px-4 py-2 rounded-xl transition-colors border border-slate-200"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {course?.join_code}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* AI Insight Banner */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand-200" />
            <div>
              <p className="font-semibold mb-1.5">AI Teaching Insight</p>
              <p className="text-brand-100 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: insight_summary
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    .replace(/⚠️/g, '<span>⚠️</span>')
                }}
              />
            </div>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total questions", value: overview.total_questions, icon: MessageSquare, sub: "all time" },
            { label: "Avg confusion", value: `${Math.round(overview.avg_confusion * 100)}%`, icon: Brain, sub: overview.avg_confusion > 0.6 ? "High" : overview.avg_confusion > 0.4 ? "Moderate" : "Low" },
            { label: "Direct answer requests", value: `${overview.direct_answer_pct}%`, icon: AlertTriangle, sub: "of questions" },
            { label: "Active students", value: overview.active_students, icon: Users, sub: "asked questions" },
            { label: "Conversations", value: overview.total_conversations, icon: TrendingUp, sub: "total sessions" },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <Icon size={16} className="text-slate-300" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Confusing topics bar chart */}
          <div className="card p-6 lg:col-span-2">
            <h2 className="font-semibold text-slate-900 mb-1">Top confusing topics</h2>
            <p className="text-xs text-slate-400 mb-5">Average confusion score (0–100%)</p>
            {topicBarData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-300 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topicBarData} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Confusion"]}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="confusion" radius={[0, 6, 6, 0]}>
                    {topicBarData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.confusion >= 70 ? "#ef4444" : entry.confusion >= 50 ? "#f59e0b" : "#3563f5"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Intent breakdown pie */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-1">Question intent</h2>
            <p className="text-xs text-slate-400 mb-4">What students are trying to do</p>
            {intentData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-300 text-sm">No data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={intentData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                      {intentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {intentData
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 4)
                    .map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{item.value}%</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Confusion trend */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Confusion over time</h2>
          <p className="text-xs text-slate-400 mb-5">Daily average confusion score</p>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Confusion"]}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="confusion"
                  stroke="#3563f5"
                  strokeWidth={2.5}
                  dot={{ fill: "#3563f5", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sample confused questions */}
        {sample_questions.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-1">Students are asking</h2>
            <p className="text-xs text-slate-400 mb-5">
              Highest-confusion questions (anonymized) — these reveal what students actually struggle with
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {sample_questions.map((q, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-sm text-slate-800 mb-3 leading-relaxed">"{q.content}"</p>
                  <div className="flex flex-wrap gap-2">
                    {q.topic && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                        {q.topic}
                      </span>
                    )}
                    {q.subtopic && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">
                        {q.subtopic?.replace(/_/g, " ")}
                      </span>
                    )}
                    {q.intent_type && (
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${INTENT_COLORS[q.intent_type]}18`,
                          color: INTENT_COLORS[q.intent_type],
                        }}
                      >
                        {INTENT_LABELS[q.intent_type] || q.intent_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic detail table */}
        {top_confusing_topics.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-5">Confusion by topic</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Topic</th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtopic</th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Questions</th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right pr-2">Confusion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {top_confusing_topics.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-medium text-slate-900 capitalize">{t.topic}</td>
                      <td className="py-3 text-slate-500">{t.subtopic?.replace(/_/g, " ") || "—"}</td>
                      <td className="py-3 text-right text-slate-600">{t.question_count}</td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${confusionBar(t.avg_confusion)}`}
                              style={{ width: `${t.avg_confusion * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${confusionColor(t.avg_confusion)}`}>
                            {Math.round(t.avg_confusion * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
