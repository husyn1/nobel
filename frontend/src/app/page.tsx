"use client";

import Link from "next/link";
import { BookOpen, BarChart3, MessageSquare, Users, ArrowRight, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <span className="text-lg font-bold text-slate-900">Nobel</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-secondary text-sm py-2 px-4">
            Sign in
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          AI-powered class analytics
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
          See what your students
          <br />
          <span className="text-brand-600">actually struggle with</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Students ask an AI tutor questions. Nobel analyzes every conversation and
          delivers instant, actionable insights to teachers — no manual work required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/register" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
            Start for free <ArrowRight size={18} />
          </Link>
          <Link href="/auth/login?demo=1" className="btn-secondary text-base px-8 py-3">
            View demo dashboard
          </Link>
        </div>
      </section>

      {/* Example insight card */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <div className="card p-6 shadow-xl border-0 ring-1 ring-slate-200/60">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-slate-500">Live — Introduction to Statistics · Week 6</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Questions this week", value: "247", delta: "+12%" },
              { label: "Avg confusion", value: "0.68", delta: "↑ High" },
              { label: "Direct answer requests", value: "31%", delta: "Watch" },
              { label: "Active students", value: "19/20", delta: "Active" },
            ].map(({ label, value, delta }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs font-medium text-brand-600 mt-0.5">{delta}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>AI Insight:</strong> Students are most confused about{" "}
            <strong>Bayes theorem</strong> (68% avg confusion). A notable 31% of questions are
            direct answer requests — consider a worked-example review session.
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          Everything teachers need. Zero extra work.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: MessageSquare,
              title: "AI Tutor Chat",
              desc: "Students get instant help. Every question is quietly analyzed in the background.",
            },
            {
              icon: BarChart3,
              title: "Confusion Analytics",
              desc: "See which topics cause the most confusion, ranked and visualized in real time.",
            },
            {
              icon: Users,
              title: "Class Overview",
              desc: "Track engagement, intent breakdown, and which students may be struggling.",
            },
            {
              icon: BookOpen,
              title: "Teaching Advice",
              desc: "AI-generated summaries turn raw data into specific, actionable recommendations.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                <Icon className="text-brand-600" size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        © 2026 Nobel. Built for educators.
      </footer>
    </div>
  );
}
