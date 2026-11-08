import Link from "next/link";
import { ArrowRight, ShieldCheck, Database, Zap, Cpu, Mail } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-20 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="flex justify-between items-center max-w-7xl mx-auto w-full z-10">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
            TS
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            TokenSaver <span className="text-teal-400">RAG</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/chat"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-all"
          >
            Open Chat
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center my-auto py-16 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-semibold mb-6 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> 100% Local • Zero Cloud Cost (0 Rs)
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
          TokenSaver <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-teal-400 bg-clip-text text-transparent">RAG</span>
        </h1>

        <p className="text-lg sm:text-2xl text-slate-300 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload PDF, Query Grounded Knowledge & Save Cloud LLM Tokens
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/chat"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 transition-all flex items-center justify-center"
          >
            Direct Chat Demo
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <Cpu className="w-8 h-8 text-teal-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Local Embeddings</h3>
            <p className="text-xs text-slate-400">
              Ollama / nomic-embed-text local pipeline. Zero API costs incurred.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <Database className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Semantic Caching</h3>
            <p className="text-xs text-slate-400">
              Redis exact matches + Qdrant similarity match to drop LLM queries to zero.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <Mail className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Async Email Callback</h3>
            <p className="text-xs text-slate-400">
              Long-running questions dispatched to queue; results sent straight to inbox.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-slate-900 z-10">
        TokenSaver RAG • Milestone 1 Architecture • Clean Stack (FastAPI + Qdrant + PostgreSQL + Redis + Next.js)
      </footer>
    </main>
  );
}

