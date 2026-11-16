"""ONNX Runtime backend."""

from ..config import QuantConfig


class OnnxBackend:
    def __init__(self, config: QuantConfig):
        # TODO: implement ONNX Runtime inference
        raise NotImplementedError("ONNX backend not yet implemented")

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.0,
        seed: int | None = None,
    ) -> str:
        raise NotImplementedError

    def unload(self):
        pass
