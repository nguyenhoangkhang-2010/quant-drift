"""Backend protocol — any backend must implement this interface."""

from typing import Protocol


class InferenceBackend(Protocol):
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.0,
        seed: int | None = None,
    ) -> tuple[str, int]:
        """Generate text. Returns (output_text, token_count)."""
        ...

    def unload(self) -> None: ...
