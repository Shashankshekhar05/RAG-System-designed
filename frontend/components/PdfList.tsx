"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react";
import { DocumentItem, deleteDocument } from "@/lib/api";

interface PdfListProps {
  documents: DocumentItem[];
  loading: boolean;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
}

export default function PdfList({
  documents,
  loading,
  selectedDocId,
  onSelectDoc,
  onOpenUpload,
  onRefresh,
}: PdfListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document and its vector chunks?")) {
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
    <aside className="w-80 h-full bg-slate-900/60 border-r border-slate-800 flex flex-col justify-between p-4">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Documents</h2>
          </div>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
            {documents.length} docs
          </span>
        </div>

        <button
          onClick={onOpenUpload}
          className="w-full py-2.5 px-3 mb-4 rounded-xl text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Upload New PDF
        </button>

        {/* Document List Stream */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading && documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400 mb-2" />
              <span className="text-xs">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">No documents uploaded</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Upload a PDF to start local indexing
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
                  className={`group relative p-3 rounded-xl border text-left cursor-pointer transition ${
                    isSelected
                      ? "bg-slate-800/80 border-teal-500/50 shadow-sm"
                      : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-slate-200 truncate pr-6">
                      {doc.file_name}
                    </span>

                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      disabled={isDeleting}
                      title="Delete document"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition absolute right-2 top-2"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      {doc.status === "ready" && (
                        <span className="inline-flex items-center gap-1 text-teal-400">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {(doc.status === "processing" || doc.status === "uploading") && (
                        <span className="inline-flex items-center gap-1 text-amber-400 animate-pulse">
                          <Clock className="w-3 h-3" /> Ingesting...
                        </span>
                      )}
                      {doc.status === "failed" && (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <AlertTriangle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </div>

                    <span>{doc.total_chunks} chunks</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">Local Storage Status</p>
        <p className="text-[10px] text-slate-500">
          Qdrant: tokensaver_chunks (384-dim)
        </p>
      </div>
    </aside>
  );
}
