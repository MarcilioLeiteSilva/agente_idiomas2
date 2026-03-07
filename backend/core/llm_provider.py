from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def llm_stream(self, messages: list) -> any:
        """Stream response from LLM."""
        pass

    @abstractmethod
    def stt(self, audio_data: str, mime_type: str) -> str:
        """Speech to text."""
        pass
    
    @abstractmethod
    def tts(self, text: str) -> dict:
        """Text to speech."""
        pass
