"""ONNX Runtime backend (placeholder)."""

from ..config import QuantConfig


class OnnxBackend:
    def __init__(self, config: QuantConfig):
        raise NotImplementedError(
            "ONNX backend not yet implemented. "
            "Use 'transformers' or 'llamacpp' backend instead."
        )

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.0,
        seed: int | None = None,
    ) -> tuple[str, int]:
        raise NotImplementedError

    def unload(self):
        pass
