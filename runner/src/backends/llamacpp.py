"""llama.cpp backend for GGUF models."""

from pathlib import Path

from ..config import QuantConfig


class LlamaCppBackend:
    def __init__(self, config: QuantConfig):
        from llama_cpp import Llama

        if not config.model_path:
            raise ValueError("model_path required for llamacpp backend. Set it in the YAML config.")
        if not Path(config.model_path).exists():
            raise FileNotFoundError(f"Model file not found: {config.model_path}")

        self.model = Llama(
            model_path=config.model_path,
            n_ctx=config.n_ctx,
            n_gpu_layers=config.n_gpu_layers,
            verbose=False,
        )

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.0,
        seed: int | None = None,
    ) -> tuple[str, int]:
        """Generate text. Returns (output_text, token_count)."""
        response = self.model.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
            seed=seed,
        )
        content = response["choices"][0]["message"]["content"]
        tokens = response.get("usage", {}).get("completion_tokens", len(content.split()))
        return content, tokens

    def unload(self):
        del self.model
