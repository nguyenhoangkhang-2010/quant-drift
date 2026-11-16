"""Verify translations by comparing semantic meaning."""

from .semantic_verifier import SemanticVerifier


class TranslationVerifier:
    def __init__(self):
        self.semantic = SemanticVerifier()

    def translations_match(self, baseline: str, quantized: str, threshold: float = 0.85) -> bool:
        """Check if two translations convey the same meaning."""
        return self.semantic.similarity(baseline, quantized) >= threshold
