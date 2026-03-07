from abc import ABC, abstractmethod

class SpeechProvider(ABC):
    @abstractmethod
    def transcribe(self, audio_file: any, language: str = None) -> str:
        """Transcribe audio file."""
        pass
    
    @abstractmethod
    def synthesize(self, text: str, voice: str = "alloy") -> bytes:
        """Synthesize speech from text."""
        pass
