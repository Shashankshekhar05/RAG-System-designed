import re
from typing import List, Dict
import httpx
from app.config import settings
from app.utils.logger import logger

GROK_API_URL = "https://api.x.ai/v1/chat/completions"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
REQUEST_TIMEOUT = 30.0


def _fallback_local_extractive_answer(messages: List[Dict[str, str]]) -> str:
    """
    Zero-Cost local fallback when GROK_API_KEY is not yet populated:
    Extracts relevant sentence from context chunks and includes page citation.
    """
    user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
    is_hindi = len(re.findall(r"[\u0900-\u097F]", user_msg)) > 20
    
    # Extract page number and sentences from context
    pages = re.findall(r"\[Chunk \d+ - Page (\d+)\]:\n(.*?)(?=\n\n\[Chunk|\n\nContext|\n\nQuestion|$)", user_msg, re.DOTALL)
    if pages:
        first_page, first_content = pages[0]
        # Clean lines and take first couple meaningful sentences
        sentences = [s.strip() for s in first_content.split(".") if len(s.strip()) > 10]
        summary_sentence = sentences[0] if sentences else first_content.strip()[:150]
        citation = f"[Page {first_page} ke hisaab se]" if is_hindi else f"[According to Page {first_page}]"
        return f"{citation} {summary_sentence}."

    return "Iska jawab is document me nahi mila" if is_hindi else "The answer to this question is not found in the document."


def ask_grok(messages: List[Dict[str, str]]) -> str:
    """
    Call LLM API using standard OpenAI-compatible chat completions protocol.
    Supports both:
    1. Groq (free LPU tier, key starts with 'gsk_')
    2. xAI Grok (key from console.x.ai)
    Timeout is 30 seconds. On error or rate-limit, raises RuntimeError without crashing the server.
    """
    api_key = (settings.GROK_API_KEY or "").strip()

    # If no key is supplied, use zero-cost local synthesis
    if not api_key:
        logger.warning("GROK_API_KEY is not set. Using local extractive synthesis for Milestone 3 testing.")
        return _fallback_local_extractive_answer(messages)

    # Determine endpoint and model (supports both Groq and xAI Grok)
    if api_key.startswith("gsk_"):
        endpoint_url = GROQ_API_URL
        # Default Groq model if grok-beta was specified
        model_name = settings.GROK_MODEL if settings.GROK_MODEL and settings.GROK_MODEL != "grok-beta" else "openai/gpt-oss-20b"
    else:
        endpoint_url = GROK_API_URL
        model_name = settings.GROK_MODEL or "grok-beta"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 500
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            response = client.post(endpoint_url, headers=headers, json=payload)

        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                return choices[0]["message"].get("content", "").strip()
            raise RuntimeError("LLM API returned empty choices list")

        error_detail = response.text
        logger.error(f"LLM API ({endpoint_url}) returned status {response.status_code}: {error_detail}")
        raise RuntimeError(f"LLM API error: {response.status_code}")

    except httpx.TimeoutException:
        logger.error("LLM API request timed out after 30 seconds")
        raise RuntimeError("LLM API timed out")
    except Exception as e:
        logger.error(f"Failed to communicate with LLM API: {e}")
        raise
