"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Bot,
  User,
  Zap,
  Cpu,
  ShieldAlert,
  Clock,
  Sparkles,
  BookOpen,
  RotateCcw,
  Loader2,
  FileText,
} from "lucide-react";
import { askQuestion, getChatHistory, getDocSessions, DocumentItem, Citation } from "@/lib/api";

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  citations?: Citation[];
  cacheHit?: boolean;
  tokensUsed?: number;
  latencyMs?: number;
  source?: string;
  status?: string;
}

interface ChatBoxProps {
  selectedDoc: DocumentItem | null;
}

export default function ChatBox({ selectedDoc }: ChatBoxProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load existing session history when selected document changes
  useEffect(() => {
    if (!selectedDoc) {
      setMessages([]);
      setSessionId(null);
      return;
    }

    let isMounted = true;
    getDocSessions(selectedDoc.id).then((sessions) => {
      if (!isMounted) return;
      if (sessions && sessions.length > 0) {
        const latestSession = sessions[0];
        setSessionId(latestSession.id);
        getChatHistory(latestSession.id).then((history) => {
          if (!isMounted) return;
          const formatted: MessageItem[] = [];
          history.forEach((h) => {
            formatted.push({
              id: `${h.id}-q`,
              sender: "user",
              text: h.question,
            });
            if (h.answer) {
              formatted.push({
                id: `${h.id}-a`,
                sender: "assistant",
                text: h.answer,
                cacheHit: h.cache_hit,
                tokensUsed: h.tokens_used,
                latencyMs: h.latency_ms,
                source: h.cache_hit ? "cache" : "llm",
                status: h.status,
              });
            }
          });
          setMessages(formatted);
        });
      } else {
        setSessionId(null);
        setMessages([]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedDoc]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || !selectedDoc || loading) return;

    // Add user message immediately to chat stream
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: query },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await askQuestion(selectedDoc.id, query, sessionId || undefined);

      if (response.session_id) {
        setSessionId(response.session_id);
      }

      const assistantMsgId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: "assistant",
          text: response.answer,
          citations: response.citations,
          cacheHit: response.cache_hit,
          tokensUsed: response.tokens_used,
          latencyMs: response.latency_ms,
          source: response.source,
          status: response.status,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "assistant",
          text: err.message || "Failed to process question. Please try again.",
          status: "failed",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
  };

  if (!selectedDoc) {
    return (
      <section className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-950/70 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-4 text-teal-400">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Document Selected</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Please select or upload a PDF document from the left sidebar to start asking questions with zero token cost.
        </p>
      </section>
    );
  }

  return (
    <section className="flex-1 h-full flex flex-col justify-between bg-slate-950/70 relative">
      {/* Active Document Top Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2 truncate pr-4">
          <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-slate-400">Active Document:</span>
          <span className="font-semibold text-white truncate">
            {selectedDoc.file_name}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono">
            {selectedDoc.total_chunks} chunks
          </span>
        </div>

        <button
          onClick={handleNewChat}
          title="Start new conversation"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
        >
          <RotateCcw className="w-3 h-3" /> New Chat
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-3 text-teal-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Ask anything from {selectedDoc.file_name}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exact matches and semantically identical queries use 0 tokens from Redis cache.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white"
                    : msg.source === "guardrail"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                }`}
              >
                {msg.sender === "user" ? (
                  <User className="w-4 h-4" />
                ) : msg.source === "guardrail" ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              <div
                className={`rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : msg.status === "queued_for_email"
                    ? "bg-amber-950/30 border border-amber-500/40 text-amber-200 rounded-tl-none shadow-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                }`}
              >
                {msg.status === "queued_for_email" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>⏳ AI Model Busy - Answer will be delivered via Email</span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed m-0">
                      You can safely close the chat. The answer will be sent to your email and saved here.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Citations Pills */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold mr-1">
                          Citations:
                        </span>
                        {msg.citations.map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700/80 font-mono"
                          >
                            Page {c.page_no}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Performance & Source Badges */}
                {msg.sender === "assistant" && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2.5 text-[10px] font-mono text-slate-400">
                    {msg.cacheHit ? (
                      <span className="flex items-center gap-1 text-teal-400 font-semibold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                        <Zap className="w-3 h-3" />
                        {msg.source === "exact"
                          ? "By Cache (Exact)"
                          : "By Cache (Semantic)"}
                      </span>
                    ) : msg.status === "queued_for_email" ? (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> Background Email Queue
                      </span>
                    ) : msg.source === "guardrail" ? (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        <ShieldAlert className="w-3 h-3" /> Input Guardrail Blocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                        <Cpu className="w-3 h-3" /> Grok LLM
                      </span>
                    )}

                    <span>Tokens: {msg.tokensUsed ?? 0}</span>
                    {msg.latencyMs !== undefined && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-2.5 h-2.5" />
                        {msg.latencyMs}ms
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none p-4 bg-slate-900 border border-slate-800 text-slate-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>Checking cache & generating response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 backdrop-blur-md">
        <form
          onSubmit={handleSend}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder={`Ask a question from ${selectedDoc.file_name}...`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-md shadow-teal-500/20 transition flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
