"""Semantic similarity comparison using sentence embeddings."""

import numpy as np


class SemanticVerifier:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self._model = None
        self._model_name = model_name

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self._model_name)
        return self._model

    def similarity(self, text_a: str, text_b: str) -> float:
        """Compute cosine similarity between two texts."""
        embeddings = self.model.encode([text_a, text_b], normalize_embeddings=True)
        score = float(np.dot(embeddings[0], embeddings[1]))
        return max(0.0, min(1.0, score))
