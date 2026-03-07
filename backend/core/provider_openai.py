import os
import base64
import json
from typing import Generator, Any, Dict
from openai import OpenAI
from core.provider_base import AIProvider

class OpenAIProvider(AIProvider):
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.text_model = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")
        self.stt_model = os.getenv("OPENAI_STT_MODEL", "whisper-1")
        self.tts_model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
        self.tts_voice = os.getenv("OPENAI_TTS_VOICE", "alloy")

    @property
    def name(self) -> str:
        return "openai"

    def stt(self, audio_b64: str, mime: str) -> str:
        audio_bytes = base64.b64decode(audio_b64)
        print(f"DEBUG: STT received {len(audio_bytes)} bytes of audio. Mime: {mime}")
        # OpenAI Whisper often needs proper extension, but can handle bytes if given filename
        resp = self.client.audio.transcriptions.create(
            model=self.stt_model,
            file=("audio.webm", audio_bytes, mime),
        )
        return resp.text

    def llm_stream(self, messages: list) -> Generator[Dict[str, Any], None, None]:
        stream = self.client.chat.completions.create(
            model=self.text_model,
            messages=messages,
            stream=True,
            stream_options={"include_usage": True}
        )
        
        for chunk in stream:
            # Handle usage info if present in last chunk
            usage = getattr(chunk, 'usage', None)
            if usage:
                yield {"type": "usage", "input_tokens": usage.prompt_tokens, "output_tokens": usage.completion_tokens}
                continue

            if not chunk.choices:
                continue
                
            delta = chunk.choices[0].delta
            if hasattr(delta, "content") and delta.content:
                yield {"type": "delta", "text": delta.content}

    def tts(self, text: str) -> Dict[str, Any]:
        resp = self.client.audio.speech.create(
            model=self.tts_model,
            voice=self.tts_voice,
            input=text,
            response_format="mp3"
        )
        audio_bytes = resp.read()
        return {
            "mime": "audio/mpeg",
            "base64": base64.b64encode(audio_bytes).decode("utf-8"),
            "chars": len(text)
        }
