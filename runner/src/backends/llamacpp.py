"""llama.cpp backend for GGUF models."""

from ..config import QuantConfig


class LlamaCppBackend:
    def __init__(self, config: QuantConfig):
        from llama_cpp import Llama

        self.model = Llama(
            model_path=config.model_path,
            n_ctx=4096,
            n_gpu_layers=-1,
            verbose=False,
        )

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.0,
        seed: int | None = None,
    ) -> str:
        response = self.model.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
            seed=seed,
        )
        return response["choices"][0]["message"]["content"]

    def unload(self):
        del self.model
