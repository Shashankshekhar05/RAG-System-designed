"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, Sparkles, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { login, signup } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Soft Ambient Lilac/Violet Glows */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-300/35 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[300px] bg-pink-300/25 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Header / Back Link */}
      <div className="max-w-md w-full mx-auto pt-4 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-purple-900 transition group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Advisor.ai</span>
        </Link>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div className="rounded-3xl p-8 bg-white/70 backdrop-blur-3xl border border-white/80 shadow-[0_20px_50px_rgba(139,92,246,0.14)] relative">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-omago-orb mx-auto mb-3.5">
              <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-white ml-0.5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E1B4B] mb-1">
              {isSignup ? "Create your Advisor.ai Account" : "Sign in to Advisor.ai"}
            </h2>
            <p className="text-xs text-slate-500">
              {isSignup
                ? "Start querying documents with local zero-cost embeddings"
                : "Enter your credentials to access your documents and chat"}
            </p>
          </div>

          {/* Segmented Tab Switch */}
          <div className="p-1 rounded-full bg-purple-100/60 border border-purple-200/80 flex items-center mb-6 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsSignup(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
                !isSignup
                  ? "bg-white text-purple-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignup(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
                isSignup
                  ? "bg-white text-purple-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-purple-100 rounded-full text-[#1E1B4B] text-xs focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-purple-100 rounded-full text-[#1E1B4B] text-xs focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{isSignup ? "Create Advisor.ai Account" : "Sign In to Advisor.ai"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 text-center text-[11px] text-slate-400 border-t border-purple-100 pt-4">
            Protected by bcrypt password encryption & stateless JWT session tokens.
          </div>
        </div>
      </div>

      {/* Clean bottom note */}
      <div className="text-center text-xs text-slate-400 pb-2 z-10">
        Advisor.ai • Intelligent Document Copilot
      </div>
    </div>
  );
}
