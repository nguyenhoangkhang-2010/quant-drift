"""Semantic similarity comparison using sentence embeddings."""

import threading

import numpy as np

_model_cache: dict[str, object] = {}
_model_lock = threading.Lock()


def _get_model(model_name: str):
    with _model_lock:
        if model_name not in _model_cache:
            from sentence_transformers import SentenceTransformer
            _model_cache[model_name] = SentenceTransformer(model_name)
        return _model_cache[model_name]


class SemanticVerifier:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self._model_name = model_name

    @property
    def model(self):
        return _get_model(self._model_name)

    def similarity(self, text_a: str, text_b: str) -> float:
        """Compute cosine similarity between two texts."""
        a = text_a.strip()
        b = text_b.strip()
        if not a or not b:
            return 0.0
        if a == b:
            return 1.0
        embeddings = self.model.encode([a, b], normalize_embeddings=True)
        score = float(np.dot(embeddings[0], embeddings[1]))
        return max(0.0, min(1.0, score))
