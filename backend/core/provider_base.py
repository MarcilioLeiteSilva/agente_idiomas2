from abc import ABC, abstractmethod
from typing import Generator, Any, Dict, Optional

class AIProvider(ABC):
    @abstractmethod
    def stt(self, audio_b64: str, mime: str) -> str:
        """Speech to Text"""
        pass

    @abstractmethod
    def llm_stream(self, messages: list) -> Generator[Dict[str, Any], None, None]:
        """Large Language Model Streaming"""
        pass

    @abstractmethod
    def tts(self, text: str) -> Dict[str, Any]:
        """Text to Speech"""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass
