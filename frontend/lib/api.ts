// TokenSaver RAG - Frontend API Client

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ACCESS_TOKEN_KEY = "tokensaver_access_token";
const REFRESH_TOKEN_KEY = "tokensaver_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Authenticated fetch wrapper
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  return res;
}

// --- Auth Endpoints ---

export async function signup(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Signup failed");
  }

  if (data.access_token) {
    setTokens(data.access_token, data.refresh_token);
  }
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Login failed");
  }

  if (data.access_token) {
    setTokens(data.access_token, data.refresh_token);
  }
  return data;
}

export async function getMe() {
  const res = await authFetch("/auth/me");
  if (!res.ok) {
    clearTokens();
    throw new Error("Unauthorized");
  }
  return await res.json();
}

export function logout() {
  clearTokens();
}

// --- PDF & Document Endpoints ---

export interface DocumentItem {
  id: string;
  file_name: string;
  status: "uploading" | "processing" | "ready" | "failed";
  total_chunks: number;
  created_at: string;
}

export async function getDocuments(): Promise<DocumentItem[]> {
  const res = await authFetch("/documents");
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch documents");
  }
  return await res.json();
}

export async function uploadPdf(file: File): Promise<{
  doc_id: string;
  file_name: string;
  status: string;
  total_chunks: number;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch("/upload-pdf", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "PDF upload failed");
  }
  return data;
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await authFetch(`/documents/${docId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete document");
  }
}

// --- Chat & RAG Endpoints (Milestone 3) ---

export interface Citation {
  page_no: number;
  snippet?: string;
}

export interface ChatAskResponse {
  answer: string;
  citations: Citation[];
  cache_hit: boolean;
  tokens_used: number;
  latency_ms: number;
  source: string;
  session_id?: string;
  message_id?: string;
  status: string;
}

export async function askQuestion(
  docId: string,
  question: string,
  sessionId?: string
): Promise<ChatAskResponse> {
  const res = await authFetch("/chat/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      doc_id: docId,
      question,
      session_id: sessionId || null,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to submit question");
  }
  return data;
}

export interface ChatMessage {
  id: string;
  question: string;
  answer?: string;
  tokens_used: number;
  cache_hit: boolean;
  status: string;
  latency_ms: number;
  created_at: string;
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const res = await authFetch(`/chat/history/${sessionId}`);
  if (!res.ok) {
    throw new Error("Failed to load chat history");
  }
  return await res.json();
}

export async function getDocSessions(docId: string): Promise<Array<{ id: string; doc_id: string; created_at: string }>> {
  const res = await authFetch(`/chat/sessions/${docId}`);
  if (!res.ok) {
    return [];
  }
  return await res.json();
}
