"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from "lucide-react";
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
        setError("Only PDF files are allowed");
        return;
      }
      if (selected.size > 20 * 1024 * 1024) {
        setError("File too large (Max 20MB)");
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a PDF file first");
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
      setError(err.message || "Failed to upload PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">Upload PDF Document</h3>
        <p className="text-xs text-slate-400 mb-6">
          Document will be parsed, cleaned, chunked into 800-char pieces, and indexed locally into Qdrant.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
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

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-950/50"
        >
          <UploadCloud className="w-12 h-12 text-teal-400 mb-3" />
          <p className="text-sm font-medium text-slate-200 mb-1">
            Click to select or drag & drop a PDF
          </p>
          <p className="text-xs text-slate-500">Max file size 20MB (PDF only)</p>
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <FileText className="w-5 h-5 text-teal-400 shrink-0" />
            <div className="flex-1 text-left truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {file.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
              Ready
            </span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Uploading & Enqueuing..." : "Start Ingestion"}
          </button>
        </div>
      </div>
    </div>
  );
}
