"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, FileText, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { uploadPdf } from "@/lib/api";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported");
        return;
      }
      if (selected.size > 20 * 1024 * 1024) {
        setError("File size exceeds 20MB limit");
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a PDF document first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await uploadPdf(file);
      setFile(null);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/20 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-lg bg-white/90 backdrop-blur-3xl border border-white/80 rounded-3xl p-7 shadow-[0_25px_60px_rgba(139,92,246,0.18)] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-omago-orb shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1E1B4B] tracking-tight">
              Add Training Document
            </h3>
            <p className="text-[11px] text-slate-500">
              Chunked into 500-char pieces & indexed into Qdrant for Advisor.ai
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,application/pdf"
          className="hidden"
        />

        {/* Drag & Drop Surface */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-5 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-purple-50/40 hover:bg-purple-50/70 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-purple-100 shadow-sm flex items-center justify-center text-purple-600 group-hover:scale-105 transition mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-[#1E1B4B] mb-1">
            Click to browse or drop PDF here
          </p>
          <p className="text-[11px] text-slate-400">Maximum size 20MB • PDF format only</p>
        </div>

        {/* Selected File Card */}
        {file && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-purple-50/60 border border-purple-100 rounded-2xl">
            <div className="h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left truncate">
              <div className="text-xs font-semibold text-[#1E1B4B] truncate">
                {file.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-medium">
              Ready
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-purple-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 disabled:opacity-40"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
            <span>{loading ? "Ingesting Document..." : "Start Ingestion"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
