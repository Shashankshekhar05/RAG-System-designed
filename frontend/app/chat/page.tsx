"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PdfList from "@/components/PdfList";
import ChatBox from "@/components/ChatBox";
import UploadModal from "@/components/UploadModal";
import { getMe, getDocuments, logout, DocumentItem } from "@/lib/api";
import {
  Search,
  Bell,
  Sparkles,
  Database,
  Layers,
  Code,
  Users,
  LogOut,
  ChevronLeft,
} from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Authenticate user
  useEffect(() => {
    let isMounted = true;
    getMe()
      .then((userData) => {
        if (isMounted) setUser(userData);
      })
      .catch(() => {
        router.push("/login");
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Fetch documents
  const fetchDocs = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDocId]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchDocs();
    }
  }, [user, fetchDocs]);

  // Auto-polling for processing documents
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.status === "processing" || d.status === "uploading"
    );

    if (hasPending) {
      pollTimerRef.current = setTimeout(() => {
        fetchDocs();
      }, 3000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [documents, fetchDocs]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const selectedDoc =
    documents.find((d) => d.id === selectedDocId) ||
    (documents.length > 0 ? documents[0] : null);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans">
      {/* Top Navigation Bar (Exact replica from the screenshot) */}
      <header className="h-16 px-6 sm:px-8 flex items-center justify-between z-30 shrink-0 border-b border-white/50 bg-white/30 backdrop-blur-2xl">
        {/* Left: Glowing Orb Logo + Advisor.ai */}
        <div className="flex items-center gap-3">
          <Link href="/chat" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-omago-orb group-hover:scale-105 transition-transform">
              <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-white ml-0.5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1E1B4B]">
              Advisor.ai
            </span>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              isSidebarOpen
                ? "bg-white/80 text-purple-900 shadow-sm border border-purple-200"
                : "text-slate-600 hover:text-purple-900 hover:bg-white/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Training Data</span>
            {documents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono ml-0.5">
                {documents.length}
              </span>
            )}
          </button>

          <Link
            href="/chat"
            className="px-3.5 py-1.5 rounded-full bg-white/80 text-purple-950 font-semibold shadow-sm border border-purple-200/80 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Instant Chat</span>
          </Link>

          <button
            onClick={() => alert("Advisor.ai Chatbot Embed widget code: <script src='http://localhost:3000/embed.js'></script>")}
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-purple-900 hover:bg-white/50 transition flex items-center gap-1.5"
          >
            <Code className="w-3.5 h-3.5 text-slate-500" />
            <span>Embed Chatbot</span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-purple-900 hover:bg-white/50 transition flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Leads</span>
          </button>
        </nav>

        {/* Right: Search Bar, Notifications, User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Frosted Search Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 border border-white/80 text-xs text-slate-500 shadow-sm backdrop-blur-md w-44">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Notification Bell */}
          <button
            title="Notifications"
            className="h-8 w-8 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-slate-600 hover:text-purple-800 flex items-center justify-center transition shadow-sm relative"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-600" />
          </button>

          {/* User Profile Avatar */}
          {user && (
            <div className="flex items-center gap-2 pl-1">
              <div
                title={user.email}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                {user.email.charAt(0).toUpperCase()}
              </div>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-white/60 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Canvas with Slide-Over Training Data Sidebar */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Slide-Over Training Data Sidebar */}
        {isSidebarOpen && (
          <div className="absolute inset-y-0 left-0 w-80 z-30 shadow-2xl animate-in slide-in-from-left duration-200">
            <PdfList
              documents={documents}
              loading={loading}
              selectedDocId={selectedDocId}
              onSelectDoc={(id) => {
                setSelectedDocId(id);
                setIsSidebarOpen(false);
              }}
              onOpenUpload={() => setIsUploadOpen(true)}
              onRefresh={fetchDocs}
              onCloseSidebar={() => setIsSidebarOpen(false)}
            />
          </div>
        )}

        {/* Central Chat Canvas */}
        <ChatBox
          selectedDoc={selectedDoc}
          onOpenUpload={() => setIsUploadOpen(true)}
          onToggleTrainingData={() => setIsSidebarOpen(!isSidebarOpen)}
          activeDocCount={documents.length}
        />
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchDocs}
      />
    </div>
  );
}
