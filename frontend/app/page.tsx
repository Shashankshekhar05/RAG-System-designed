import Link from "next/link";
import {
  Sparkles,
  Search,
  Zap,
  Lightbulb,
  GitFork,
  Box,
  Paperclip,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Mail,
  ChevronRight,
  MessageSquare,
  Mic,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Soft Ambient Lilac/Violet Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-300/35 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-[40%] -right-[100px] w-[500px] h-[500px] bg-pink-300/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 -left-[100px] w-[500px] h-[500px] bg-indigo-300/25 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navigation Bar (Exact Replica from Screenshot) */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between z-30 shrink-0 border-b border-white/50 bg-white/30 backdrop-blur-2xl">
        {/* Left: Glowing Orb Logo + Advisor.ai */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-omago-orb group-hover:scale-105 transition-transform">
              <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-white ml-0.5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1E1B4B]">
              Advisor.ai
            </span>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
          <Link
            href="/chat"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-purple-900 hover:bg-white/50 transition"
          >
            Training Data
          </Link>

          <Link
            href="/chat"
            className="px-3.5 py-1.5 rounded-full bg-white/80 text-purple-950 font-semibold shadow-sm border border-purple-200/80 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Instant Chat</span>
          </Link>

          <Link
            href="/chat"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-purple-900 hover:bg-white/50 transition"
          >
            Embed Chatbot
          </Link>

          <Link
            href="/chat"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-purple-900 hover:bg-white/50 transition"
          >
            Leads
          </Link>
        </nav>

        {/* Right: Search Bar, Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 border border-white/80 text-xs text-slate-500 shadow-sm backdrop-blur-md w-40">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-full text-[#1E1B4B] hover:text-purple-700 transition"
          >
            Sign In
          </Link>

          <Link
            href="/chat"
            className="text-xs font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Launch App</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Main Hero & Canvas Area */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center z-10 flex-1 flex flex-col justify-center items-center">
        {/* Centered Glowing Mark */}
        <div className="w-16 h-16 rounded-full bg-white/70 border border-white/80 shadow-omago-glass flex items-center justify-center mx-auto mb-4 backdrop-blur-xl animate-in zoom-in-95 duration-300">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-omago-orb">
            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1E1B4B] mb-2">
          Hi, I'm Advisor.ai
        </h1>
        <p className="text-sm text-slate-500 font-normal mb-8 max-w-md">
          How can I help you today? Ask questions, search grounded documents, and extract page citations.
        </p>

        {/* Central Frosted Island Box */}
        <div className="w-full max-w-2xl bg-white/50 hover:bg-white/60 backdrop-blur-3xl border border-white/80 rounded-3xl p-6 shadow-omago-glass transition-all mb-4 text-left">
          <p className="text-sm text-slate-400 mb-6 font-normal">
            Ask anything from your documents, policies, or architecture...
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-white/50">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-full bg-white/60 text-slate-500 shadow-sm border border-white/80">
                <Paperclip className="w-3.5 h-3.5" />
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 border border-white/80 text-xs text-slate-700 font-medium shadow-sm">
                <Search className="w-3 h-3 text-purple-600" />
                <span>Deep search</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 border border-white/80 text-xs text-slate-700 font-medium shadow-sm">
                <span>Search</span>
              </span>
            </div>

            <Link
              href="/chat"
              className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 hover:scale-105 transition"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Quick Mode Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/60 border border-white/70 text-xs text-slate-700 font-medium shadow-sm">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Fast (0-Token Cache)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/60 border border-white/70 text-xs text-slate-700 font-medium shadow-sm">
            <Lightbulb className="w-3 h-3 text-purple-600" />
            <span>In-depth (Grounded)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/60 border border-white/70 text-xs text-slate-700 font-medium shadow-sm">
            <GitFork className="w-3 h-3 text-indigo-500" />
            <span>Hybrid Search</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/60 border border-white/70 text-xs text-slate-700 font-medium shadow-sm">
            <Box className="w-3 h-3 text-cyan-600" />
            <span>Holistic Recall</span>
          </span>
        </div>

        {/* Feature Grid Below */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-3xl w-full">
          <div className="p-5 rounded-2xl bg-white/40 border border-white/60 shadow-sm backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#1E1B4B] mb-1">Semantic Cache Engine</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Drop repetitive LLM costs to ₹0 using local Redis cosine similarity embeddings.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/40 border border-white/60 shadow-sm backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 mb-2.5">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#1E1B4B] mb-1">Local Embeddings</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Powered by Python all-MiniLM-L6-v2 on Qdrant. Zero third-party embedding bills.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/40 border border-white/60 shadow-sm backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-700 mb-2.5">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#1E1B4B] mb-1">Async Email Callback</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Rate limits or timeouts trigger background retries and instant inbox dispatch.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/40 py-6 text-center text-xs text-slate-500 z-10 bg-white/20 backdrop-blur-md">
        Advisor.ai • Intelligent Document Teammate • Powered by FastAPI, Qdrant, PostgreSQL & Redis
      </footer>
    </div>
  );
}
