"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PdfList from "@/components/PdfList";
import ChatBox from "@/components/ChatBox";
import UploadModal from "@/components/UploadModal";
import { getMe, getDocuments, logout, DocumentItem } from "@/lib/api";
import { ArrowLeft, Cpu, Database, Mail, LogOut, User } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
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

  // Auto-polling when documents are in 'processing' or 'uploading' status
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
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Header with Status Indicators & User Profile */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center font-bold text-white text-xs">
              TS
            </div>
            <span className="font-bold text-sm text-white hidden sm:inline">
              TokenSaver <span className="text-teal-400">RAG</span>
            </span>
          </div>
        </div>

        {/* System Badges Bar */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 font-medium">
            <Database className="w-3.5 h-3.5" />
            Semantic Cache: <span className="font-bold">ON</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium">
            <Cpu className="w-3.5 h-3.5" />
            Local Embedding: <span className="font-bold">ON</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium hidden md:inline-flex">
            <Mail className="w-3.5 h-3.5" />
            Callback: <span className="font-bold">Email</span>
          </span>
        </div>

        {/* User Account & Logout */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span className="truncate max-w-[150px]">{user.email}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace: Left PdfList + Right ChatBox */}
      <main className="flex-1 flex overflow-hidden">
        <PdfList
          documents={documents}
          loading={loading}
          selectedDocId={selectedDocId}
          onSelectDoc={(id) => setSelectedDocId(id)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onRefresh={fetchDocs}
        />
        <ChatBox selectedDoc={selectedDoc} />
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
