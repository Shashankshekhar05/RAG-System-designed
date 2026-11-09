"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Paperclip,
  Search,
  Zap,
  Lightbulb,
  GitFork,
  Box,
  Send,
  Loader2,
  FileText,
  ArrowUp,
  ChevronRight,
  Copy,
  Check,
  CheckCircle2,
  MessageSquare,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { askQuestion, getChatHistory, getDocSessions, DocumentItem, Citation } from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  citations?: Citation[];
  cacheHit?: boolean;
  source?: "exact" | "semantic" | "llm" | "guardrail" | "email_callback";
  tokensUsed?: number;
  latencyMs?: number;
  status?: string;
  timestamp?: string;
}

interface ChatBoxProps {
  selectedDoc: DocumentItem | null;
  onOpenUpload?: () => void;
  onToggleTrainingData?: () => void;
  activeDocCount?: number;
  newChatTrigger?: number;
  onNewChat?: () => void;
}

function renderFormattedMessage(text: string) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Check for bullet lines starting with -, *, or •
        const isBullet = /^[-\*•]\s+/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^[-\*•]\s+/, "") : trimmed;

        // Parse **bold** markdown parts and filter out any raw asterisks
        const parts = content.split(/(\*\*.*?\*\*)/g);
        const parsedContent = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
            return (
              <strong key={pIdx} className="font-semibold text-purple-950">
                {part.slice(2, -2).replace(/\*/g, "")}
              </strong>
            );
          }
          // Remove stray asterisks from ordinary text
          return part.replace(/\*/g, "");
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
              <span className="flex-1">{parsedContent}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="m-0">
            {parsedContent}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatBox({
  selectedDoc,
  onOpenUpload,
  onToggleTrainingData,
  activeDocCount = 0,
  newChatTrigger = 0,
  onNewChat,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"fast" | "indepth" | "hybrid" | "holistic">("fast");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNewSessionRef = useRef(false);
  const prevDocIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle New Chat triggered from outside or header
  useEffect(() => {
    if (newChatTrigger && newChatTrigger > 0) {
      isNewSessionRef.current = true;
      setSessionId(null);
      setMessages([]);
      setInput("");
    }
  }, [newChatTrigger]);

  // Load chat history ONLY when selected document actually changes
  useEffect(() => {
    if (!selectedDoc) {
      setMessages([]);
      setSessionId(null);
      prevDocIdRef.current = null;
      return;
    }

    // If document hasn't changed or if user clicked New Chat, don't overwrite current state
    if (prevDocIdRef.current === selectedDoc.id) {
      return;
    }
    prevDocIdRef.current = selectedDoc.id;

    if (isNewSessionRef.current) {
      isNewSessionRef.current = false;
      return;
    }

    let isMounted = true;
    getDocSessions(selectedDoc.id)
      .then(async (sessions) => {
        if (!isMounted) return;
        if (sessions && sessions.length > 0) {
          const latest = sessions[0];
          setSessionId(latest.id);
          const history = await getChatHistory(latest.id);
          if (!isMounted) return;

          const formatted: Message[] = [];
          for (const item of history) {
            formatted.push({
              id: `q-${item.id}`,
              sender: "user",
              text: item.question,
              timestamp: "Just now",
            });
            if (item.answer) {
              formatted.push({
                id: `a-${item.id}`,
                sender: "assistant",
                text: item.answer,
                tokensUsed: item.tokens_used,
                cacheHit: item.cache_hit,
                latencyMs: item.latency_ms,
                status: item.status,
                timestamp: "Just now",
              });
            }
          }
          setMessages(formatted);
        } else {
          setMessages([]);
          setSessionId(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load conversation history:", err);
        setMessages([]);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDoc?.id]);

  const handleSend = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const query = directText || input;
    if (!query.trim() || !selectedDoc || loading) return;

    const userMessageText = query.trim();
    if (!directText) setInput("");

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add User Message to stream
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userMessageText,
      timestamp: timeStr,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await askQuestion(
        selectedDoc.id,
        userMessageText,
        sessionId || undefined
      );

      if (res.session_id && !sessionId) {
        setSessionId(res.session_id);
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: res.answer,
        citations: res.citations,
        cacheHit: res.cache_hit || res.source === "exact" || res.source === "semantic",
        source: res.source as any,
        tokensUsed: res.tokens_used,
        latencyMs: res.latency_ms,
        status: res.status,
        timestamp: timeStr,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: `Error processing query: ${err.message || "Please try again."}`,
        source: "guardrail",
        tokensUsed: 0,
        timestamp: timeStr,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    isNewSessionRef.current = true;
    setSessionId(null);
    setMessages([]);
    setInput("");
    if (onNewChat) onNewChat();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 h-full flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Soft Ambient Lilac/Violet Glows */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[750px] h-[400px] bg-purple-300/30 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-[45%] right-[5%] w-[500px] h-[400px] bg-pink-300/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[5%] w-[450px] h-[350px] bg-indigo-300/20 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Big-Screen Workspace */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth z-10 flex flex-col items-center">
        {!hasMessages ? (
          /* EMPTY STATE / WELCOME HERO (Centered on the big screen) */
          <div className="my-auto max-w-2xl w-full text-center animate-in fade-in duration-300 py-8">
            {/* Centered Glowing Emblem */}
            <div className="w-16 h-16 rounded-full bg-white/70 border border-white/80 shadow-omago-pill flex items-center justify-center mx-auto mb-4 backdrop-blur-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-omago-orb">
                <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E1B4B] mb-2">
              Hi, I'm Advisor.ai
            </h1>
            <p className="text-sm text-slate-500 font-normal mb-8 max-w-md mx-auto">
              {selectedDoc
                ? `Ready to query ${selectedDoc.file_name}. Ask questions and get verified page citations.`
                : "How can I help you today? Upload a PDF document to ground all answers."}
            </p>

            {/* Central Frosted Island Input Box */}
            <div className="w-full bg-white/50 hover:bg-white/65 backdrop-blur-2xl border border-white/80 rounded-3xl p-5 shadow-omago-glass transition-all duration-200 mb-6 text-left relative group">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                rows={2}
                placeholder={
                  selectedDoc
                    ? `Ask anything from ${selectedDoc.file_name}...`
                    : "Ask anything... (Select or upload a PDF first)"
                }
                className="w-full bg-transparent resize-none text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    title="Upload PDF Document"
                    className="p-2 rounded-full bg-white/60 hover:bg-white/90 text-slate-600 hover:text-purple-700 transition shadow-sm border border-white/80"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend(undefined, input)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-xs text-slate-700 font-medium transition shadow-sm"
                  >
                    <Search className="w-3 h-3 text-purple-600" />
                    <span>Deep search</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend(undefined, input)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-xs text-slate-700 font-medium transition shadow-sm"
                  >
                    <span>Search</span>
                  </button>
                </div>

                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim() || !selectedDoc}
                  className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-purple-500/25 disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>

            {/* Mode Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <button
                type="button"
                onClick={() => setActiveMode("fast")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition shadow-sm backdrop-blur-md ${
                  activeMode === "fast"
                    ? "bg-white/90 text-purple-950 border border-purple-200 shadow-purple-500/10 font-semibold"
                    : "bg-white/40 hover:bg-white/60 text-slate-600 border border-white/60"
                }`}
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Fast</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode("indepth")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition shadow-sm backdrop-blur-md ${
                  activeMode === "indepth"
                    ? "bg-white/90 text-purple-950 border border-purple-200 shadow-purple-500/10 font-semibold"
                    : "bg-white/40 hover:bg-white/60 text-slate-600 border border-white/60"
                }`}
              >
                <Lightbulb className="w-3 h-3 text-purple-600" />
                <span>In-depth</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode("hybrid")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition shadow-sm backdrop-blur-md ${
                  activeMode === "hybrid"
                    ? "bg-white/90 text-purple-950 border border-purple-200 shadow-purple-500/10 font-semibold"
                    : "bg-white/40 hover:bg-white/60 text-slate-600 border border-white/60"
                }`}
              >
                <GitFork className="w-3 h-3 text-indigo-500" />
                <span>Hybrid</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode("holistic")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition shadow-sm backdrop-blur-md ${
                  activeMode === "holistic"
                    ? "bg-white/90 text-purple-950 border border-purple-200 shadow-purple-500/10 font-semibold"
                    : "bg-white/40 hover:bg-white/60 text-slate-600 border border-white/60"
                }`}
              >
                <Box className="w-3 h-3 text-cyan-600" />
                <span>Holistic</span>
              </button>
            </div>

            {/* Quick Starter Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <button
                onClick={() => handleSend(undefined, "Summarize key architecture and main points")}
                className="p-3.5 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/70 text-xs text-[#1E1B4B] transition shadow-sm flex items-center justify-between group"
              >
                <span className="font-medium text-slate-700 group-hover:text-purple-900">
                  Summarize key points & architecture ✨
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => handleSend(undefined, "What are the core technical constraints and security requirements?")}
                className="p-3.5 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/70 text-xs text-[#1E1B4B] transition shadow-sm flex items-center justify-between group"
              >
                <span className="font-medium text-slate-700 group-hover:text-purple-900">
                  Inspect constraints & security requirements 💬
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        ) : (
          /* CONVERSATION STREAM (Full big-screen central column) */
          <div className="max-w-3xl w-full space-y-6 pb-6 pt-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 items-start ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                } animate-in fade-in duration-200`}
              >
                {/* Avatar */}
                {msg.sender === "user" ? (
                  <div className="w-8 h-8 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                    U
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-omago-orb shrink-0 mt-0.5">
                    <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-white ml-0.5" />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={`relative group ${
                    msg.sender === "user"
                      ? "max-w-[85%] bg-[#1E1B4B] text-white rounded-3xl rounded-tr-sm px-5 py-3.5 shadow-md text-sm leading-relaxed"
                      : "flex-1 bg-white/70 hover:bg-white/80 backdrop-blur-2xl border border-white/90 rounded-3xl rounded-tl-sm p-5 shadow-omago-card text-[#1E1B4B] text-sm leading-relaxed"
                  }`}
                >
                  {/* Assistant Header: Name + Timestamp + Copy Button */}
                  {msg.sender === "assistant" && (
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-purple-100/70">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-purple-950">Advisor.ai</span>
                        {msg.timestamp && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {msg.timestamp}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        title="Copy answer"
                        className="p-1 rounded-md text-slate-400 hover:text-purple-700 hover:bg-white/60 transition flex items-center gap-1 text-[11px]"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 text-[10px] font-medium">Copied</span>
                          </>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Body Text */}
                  {renderFormattedMessage(msg.text)}

                  {/* Citations Tag Pills */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-purple-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">
                        Citations:
                      </span>
                      {msg.citations.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100/80 border border-purple-300 text-purple-900 text-xs font-mono font-medium shadow-sm hover:bg-purple-200/80 transition cursor-default"
                        >
                          <FileText className="w-3 h-3 text-purple-600" />
                          <span>Page {c.page_no}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Assistant Meta / Cache / Tokens Footer */}
                  {msg.sender === "assistant" && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {msg.cacheHit ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-sm">
                            <Zap className="w-3 h-3" />
                            <span>By Cache (0-Token)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                            <span>LLM</span>
                          </span>
                        )}

                        {msg.tokensUsed !== undefined && (
                          <span>{msg.tokensUsed} tokens</span>
                        )}
                      </div>

                      {msg.latencyMs !== undefined && (
                        <span className="text-[10px] text-slate-400">
                          {msg.latencyMs} ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator in conversation stream */}
            {loading && (
              <div className="flex gap-3.5 items-start animate-in fade-in duration-150">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-omago-orb shrink-0 mt-0.5">
                  <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-white ml-0.5" />
                </div>

                <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl rounded-tl-sm p-4 shadow-omago-card text-[#1E1B4B] text-xs flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-purple-950 font-medium">
                    Advisor.ai is searching documents & verifying page citations...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* DOCKED BOTTOM INPUT BAR (When conversation is in progress on the big screen) */}
      {hasMessages && (
        <div className="max-w-3xl w-full mx-auto px-4 pb-5 pt-2 z-20 shrink-0">
          <div className="bg-white/60 hover:bg-white/75 backdrop-blur-3xl border border-white/80 rounded-3xl p-3.5 shadow-omago-glass transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              rows={1}
              placeholder={
                selectedDoc
                  ? `Ask follow-up from ${selectedDoc.file_name}...`
                  : "Type follow-up question..."
              }
              className="w-full bg-transparent resize-none text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none px-2 pt-1"
            />

            <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-white/40">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onOpenUpload}
                  title="Upload / Attach PDF Document"
                  className="p-1.5 rounded-full bg-white/70 hover:bg-white text-slate-600 hover:text-purple-700 transition shadow-sm border border-white/80"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSend(undefined, input)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 hover:bg-white border border-white/80 text-xs text-slate-700 font-medium transition shadow-sm"
                >
                  <Search className="w-3 h-3 text-purple-600" />
                  <span>Deep search</span>
                </button>

                {/* Quick Mode Switcher in bottom bar */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveMode((prev) =>
                      prev === "fast"
                        ? "indepth"
                        : prev === "indepth"
                        ? "hybrid"
                        : prev === "hybrid"
                        ? "holistic"
                        : "fast"
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-xs text-slate-700 font-medium shadow-sm transition"
                >
                  {activeMode === "fast" && <Zap className="w-3 h-3 text-amber-500" />}
                  {activeMode === "indepth" && <Lightbulb className="w-3 h-3 text-purple-600" />}
                  {activeMode === "hybrid" && <GitFork className="w-3 h-3 text-indigo-500" />}
                  {activeMode === "holistic" && <Box className="w-3 h-3 text-cyan-600" />}
                  <span className="capitalize">{activeMode}</span>
                </button>
              </div>

              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim() || !selectedDoc}
                className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-purple-500/25 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>

          <p className="text-[10px] text-center text-slate-400 mt-2 font-normal">
            Advisor.ai answers strictly from grounded PDF context with verified citations.
          </p>
        </div>
      )}
    </div>
  );
}
