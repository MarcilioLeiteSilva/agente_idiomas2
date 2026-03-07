from core.store import Store

class Memory:
    def __init__(self, store: Store):
        self.store = store

    def get_context(self, session_id: str) -> dict:
        """Retrieve full context for a session including profile and history."""
        # Placeholder for future implementation
        return {}
