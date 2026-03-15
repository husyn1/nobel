"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Plus, Bot, User, Zap, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { sendMessage, getConversations, getEnrolledCourses } from "@/lib/api";
import { getStoredAuth, clearStoredAuth } from "@/lib/auth";
import { format } from "date-fns";
import MarkdownMessage from "@/components/chat/MarkdownMessage";

interface Message {
  id: string;
  role: "student" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  messages: Message[];
}

const SUGGESTIONS = [
  "Explain this concept step by step",
  "Show me a worked example",
  "What's the intuition behind this?",
  "Help me understand why this formula works",
];

export default function ChatPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { user, role } = getStoredAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [courseName, setCourseName] = useState("AI Tutor");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user || role !== "student") { router.push("/auth/login"); return; }
    loadData();
  }, [courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function loadData() {
    try {
      const [convsRes, enrollRes] = await Promise.all([
        getConversations(courseId),
        getEnrolledCourses(),
      ]);
      const enroll = enrollRes.data.find((e: any) => e.course.id === courseId);
      if (enroll) setCourseName(enroll.course.name);
      setConversations(convsRes.data);
      if (convsRes.data.length > 0) {
        const latest = convsRes.data[0];
        setActiveConvId(latest.id);
        setMessages(latest.messages || []);
      }
    } catch { /* no conversations yet */ }
  }

  function selectConv(conv: Conversation) {
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
  }

  function newConv() {
    setActiveConvId(null);
    setMessages([]);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "46px";

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "student",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await sendMessage(courseId, text, activeConvId || undefined);
      const { conversation_id, message, reply } = res.data;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...message, role: "student" as const },
        { ...reply, role: "assistant" as const },
      ]);
      if (!activeConvId) {
        setActiveConvId(conversation_id);
        const convsRes = await getConversations(courseId);
        setConversations(convsRes.data);
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error(err.response?.data?.detail || "Failed to send");
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "46px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  }

  return (
    /* Fixed overlay — guaranteed to fill the full viewport */
    <div className="fixed inset-0 flex bg-slate-50">

      {/* ────── Sidebar ────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-slate-200">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-100 flex-shrink-0">
          <Link href="/student/dashboard"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center flex-shrink-0">
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-semibold text-slate-800 text-sm truncate">{courseName}</span>
        </div>

        {/* New chat */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <button onClick={newConv}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus size={14} /> New chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
          {conversations.length === 0
            ? <p className="text-xs text-slate-400 text-center px-3 pt-8 leading-relaxed">Start a conversation to see it here</p>
            : conversations.map((c) => (
              <button key={c.id} onClick={() => selectConv(c)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  activeConvId === c.id
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-slate-600 hover:bg-slate-100"
                }`}>
                <p className="truncate font-medium">{c.title || "Conversation"}</p>
                <p className="text-slate-400 mt-0.5">{format(new Date(c.created_at), "MMM d, h:mm a")}</p>
              </button>
            ))
          }
        </div>

        {/* User footer */}
        <div className="flex-shrink-0 border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0">
              {user?.full_name?.[0] ?? "S"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400">Student</p>
            </div>
            <button onClick={() => { clearStoredAuth(); router.push("/auth/login"); }}
              className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ────── Chat column ────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Messages area — takes all available space and scrolls */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                <Bot size={28} className="text-brand-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">What would you like to learn?</h2>
              <p className="text-slate-400 text-sm max-w-xs mb-8 leading-relaxed">
                Ask anything about your course. I'll help you understand — not just give you the answer.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className="text-left text-sm bg-white border border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-600 hover:text-brand-700 px-4 py-3 rounded-xl transition-all leading-snug">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "student" ? "flex-row-reverse" : "flex-row"}`}>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 self-start mt-0.5 ${
                    msg.role === "student" ? "bg-brand-600" : "bg-slate-100 border border-slate-200"
                  }`}>
                    {msg.role === "student"
                      ? <User size={14} className="text-white" />
                      : <Bot size={14} className="text-slate-500" />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "student"
                      ? "bg-brand-600 text-white rounded-tr-sm"
                      : "bg-white border border-slate-200 shadow-sm rounded-tl-sm"
                  }`}>
                    <MarkdownMessage content={msg.content} isStudent={msg.role === "student"} />
                    <p className={`text-[11px] mt-2 select-none ${
                      msg.role === "student" ? "text-brand-200 text-right" : "text-slate-400"
                    }`}>
                      {format(new Date(msg.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-slate-500" />
                  </div>
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3.5">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ────── Input bar — always pinned to bottom ────── */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
          <form onSubmit={handleSend} className="flex items-end gap-2 max-w-2xl mx-auto">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the material…"
              className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-all leading-relaxed"
              style={{ minHeight: "46px", maxHeight: "140px" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-colors mb-0.5"
            >
              <Send size={15} />
            </button>
          </form>
          <p className="text-[11px] text-slate-400 text-center mt-1.5 select-none">
            Enter to send · Shift+Enter for new line
          </p>
        </div>

      </div>
    </div>
  );
}
