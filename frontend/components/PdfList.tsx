"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  Layers,
  X,
  HardDrive,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { DocumentItem, deleteDocument } from "@/lib/api";

interface PdfListProps {
  documents: DocumentItem[];
  loading: boolean;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
  onCloseSidebar?: () => void;
}

export default function PdfList({
  documents,
  loading,
  selectedDocId,
  onSelectDoc,
  onOpenUpload,
  onRefresh,
  onCloseSidebar,
}: PdfListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document and all its indexed vector chunks?")) {
      return;
    }

    setDeletingId(docId);
    try {
      await deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-80 h-full bg-white/80 backdrop-blur-2xl border-r border-white/80 flex flex-col justify-between p-5 shadow-2xl font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-700" />
            <h2 className="text-xs font-bold tracking-wide text-[#1E1B4B] uppercase">
              Training Data
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full text-purple-800 font-mono">
              {documents.length} docs
            </span>
            {onCloseSidebar && (
              <button
                onClick={onCloseSidebar}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="w-full py-2.5 px-3 mb-4 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload PDF Document</span>
        </button>

        {/* Documents Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading && documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600 mb-2" />
              <span className="text-xs">Loading training data...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-purple-200 rounded-2xl bg-white/40">
              <FileText className="w-7 h-7 text-purple-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No documents indexed</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload a PDF to ground Advisor.ai responses
              </p>
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const isDeleting = deletingId === doc.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className={`group relative p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-purple-100/70 border-purple-300 shadow-sm"
                      : "bg-white/60 border-white/80 hover:bg-white/90 hover:border-purple-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate pr-4">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-purple-700" : "text-slate-400"}`} />
                      <span className={`text-xs font-medium truncate ${isSelected ? "text-purple-950 font-semibold" : "text-slate-700"}`}>
                        {doc.file_name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      disabled={isDeleting}
                      title="Delete document"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition absolute right-2.5 top-2.5"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                      {doc.status === "ready" && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      )}
                      {(doc.status === "processing" || doc.status === "uploading") && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Ingesting...</span>
                        </span>
                      )}
                      {doc.status === "failed" && (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>

                    <span className="text-slate-500">{doc.total_chunks} chunks</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Vector Store Footer */}
      <div className="mt-3 p-3 rounded-2xl bg-white/60 border border-purple-100 text-[11px] text-slate-600">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <HardDrive className="w-3 h-3 text-purple-600" />
            <span>Qdrant Local Store</span>
          </span>
          <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-full">
            Local 0 Rs
          </span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono truncate">
          tokensaver_chunks (384-dim)
        </p>
      </div>
    </aside>
  );
}
