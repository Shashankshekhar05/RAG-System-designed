from typing import List

EMAIL_SUCCESS_SUBJECT = "TokenSaver RAG - Tumhare Question Ka Answer Aa Gaya!"
EMAIL_FAILURE_SUBJECT = "TokenSaver RAG - Update on your question"


def build_answer_email(
    question: str,
    answer: str,
    page_nos: List[int],
    chat_link: str
) -> str:
    """Generate clean HTML email for successful delayed RAG response."""
    import re
    citations_str = ", ".join(f"Page {p}" for p in sorted(set(page_nos))) if page_nos else "Document Context"
    is_hindi_ans = len(re.findall(r"[\u0900-\u097F]", answer)) > 10
    citation_tag = f"[{citations_str} ke hisaab se]" if is_hindi_ans else f"[According to {citations_str}]"
    button_label = "Chat Me Dekho" if is_hindi_ans else "View in Chat"

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{EMAIL_SUCCESS_SUBJECT}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #030712; color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px;">
      <h1 style="color: #14b8a6; font-size: 22px; margin: 0 0 6px 0;">Tumhara Answer Ready Hai!</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">TokenSaver RAG ne tumhara background query fulfill kar diya hai.</p>
    </div>

    <!-- Question -->
    <div style="background-color: #030712; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Sawal (Question):</span>
      <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.5;">{question}</p>
    </div>

    <!-- Answer -->
    <div style="background-color: #030712; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <span style="font-size: 11px; font-weight: 700; color: #2dd4bf; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Jawab (Answer):</span>
      <p style="margin: 0; font-size: 14px; color: #f8fafc; line-height: 1.6; white-space: pre-line;">{answer}</p>
      
      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
        <strong style="color: #2dd4bf;">Citation:</strong> {citation_tag}
      </div>
    </div>

    <!-- Action Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="{chat_link}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #14b8a6); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(20, 184, 166, 0.3);">
        {button_label}
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; font-size: 11px; color: #64748b;">
      <p style="margin: 0 0 4px 0;">TokenSaver RAG - Zero-Cost Local PDF Assistant</p>
      <p style="margin: 0;">This answer has been automatically saved to your web chat.</p>
    </div>
  </div>
</body>
</html>"""
    return html


def build_failure_email(question: str, chat_link: str) -> str:
    """Generate clean HTML email when background retries are exhausted."""
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{EMAIL_FAILURE_SUBJECT}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #030712; color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
    <h2 style="color: #f87171; font-size: 20px; margin-top: 0;">Update: Unable to Process Query</h2>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
      The AI model was temporarily unavailable due to rate limits or timeouts for your query:
    </p>
    <div style="background-color: #030712; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; margin: 16px 0; font-size: 13px; color: #94a3b8;">
      "{question}"
    </div>
    <p style="font-size: 13px; color: #94a3b8;">
      We could not generate an answer at this time. Please try asking again in the chat shortly.
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="{chat_link}" style="display: inline-block; background-color: #1e293b; color: #f8fafc; text-decoration: none; font-size: 13px; padding: 10px 22px; border-radius: 8px;">
        Open Chat
      </a>
    </div>
  </div>
</body>
</html>"""
    return html
