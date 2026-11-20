"""Classify drift as no-drift, benign, or dangerous per task type."""

from enum import Enum

from .verifiers.code_verifier import CodeVerifier
from .verifiers.math_verifier import MathVerifier
from .verifiers.semantic_verifier import SemanticVerifier


class DriftType(str, Enum):
    NO_DRIFT = "no_drift"
    BENIGN = "benign"
    DANGEROUS = "dangerous"


TASK_CLASSIFIERS = {
    "math": "_classify_math",
    "code": "_classify_code",
    "translation": "_classify_translation",
    "summarization": "_classify_semantic",
    "chat": "_classify_semantic",
}


class DriftClassifier:
    def __init__(self):
        self.math_verifier = MathVerifier()
        self.code_verifier = CodeVerifier()
        self.semantic_verifier = SemanticVerifier()

    def classify(
        self,
        category: str,
        baseline_output: str,
        quantized_output: str,
        prompt_text: str,
    ) -> tuple[DriftType, float, str]:
        """Classify drift between baseline and quantized output.

        Returns (drift_type, severity 0-1, explanation).
        """
        if baseline_output.strip() == quantized_output.strip():
            return DriftType.NO_DRIFT, 0.0, "Identical output"

        method_name = TASK_CLASSIFIERS.get(category, "_classify_semantic")
        method = getattr(self, method_name)
        return method(baseline_output, quantized_output, prompt_text)

    def _classify_math(
        self, baseline: str, quantized: str, prompt: str,
    ) -> tuple[DriftType, float, str]:
        baseline_answer = self.math_verifier.extract_answer(baseline)
        quantized_answer = self.math_verifier.extract_answer(quantized)

        if baseline_answer is not None and quantized_answer is not None:
            if self.math_verifier.answers_match(baseline_answer, quantized_answer):
                return DriftType.BENIGN, 0.2, "Same answer, different wording"
            return (
                DriftType.DANGEROUS,
                1.0,
                f"Wrong answer: {baseline_answer} -> {quantized_answer}",
            )

        expr_baseline = self.math_verifier.extract_expression(baseline)
        expr_quantized = self.math_verifier.extract_expression(quantized)
        if expr_baseline and expr_quantized and expr_baseline == expr_quantized:
            return DriftType.BENIGN, 0.2, "Same expression, different explanation"

        similarity = self.semantic_verifier.similarity(baseline, quantized)
        if similarity > 0.95:
            return DriftType.BENIGN, 0.1, f"High similarity ({similarity:.3f}), no numeric answer found"
        return DriftType.DANGEROUS, 1.0 - similarity, f"Low similarity ({similarity:.3f}), no numeric answer found"

    def _classify_code(
        self, baseline: str, quantized: str, prompt: str,
    ) -> tuple[DriftType, float, str]:
        baseline_correct = self.code_verifier.check_syntax(baseline)
        quantized_correct = self.code_verifier.check_syntax(quantized)

        if baseline_correct and not quantized_correct:
            return DriftType.DANGEROUS, 1.0, "Quantized output has syntax errors"

        if not baseline_correct and not quantized_correct:
            similarity = self.semantic_verifier.similarity(baseline, quantized)
            return DriftType.BENIGN if similarity > 0.85 else DriftType.DANGEROUS, \
                1.0 - similarity, f"Both have syntax errors ({similarity:.3f})"

        if baseline_correct and quantized_correct:
            functionally_equal = self.code_verifier.compare_outputs(baseline, quantized)
            if functionally_equal:
                return DriftType.BENIGN, 0.1, "Different code, same behavior"
            return DriftType.DANGEROUS, 0.8, "Different code behavior"

        similarity = self.semantic_verifier.similarity(baseline, quantized)
        if similarity > 0.90:
            return DriftType.BENIGN, 0.2, f"Similar code ({similarity:.3f})"
        return DriftType.DANGEROUS, 1.0 - similarity, f"Different code ({similarity:.3f})"

    def _classify_translation(
        self, baseline: str, quantized: str, prompt: str,
    ) -> tuple[DriftType, float, str]:
        similarity = self.semantic_verifier.similarity(baseline, quantized)
        if similarity > 0.95:
            return DriftType.NO_DRIFT, 0.0, f"Near-identical translation ({similarity:.3f})"
        if similarity > 0.80:
            return DriftType.BENIGN, 1.0 - similarity, f"Alternate translation ({similarity:.3f})"
        return DriftType.DANGEROUS, 1.0 - similarity, f"Meaning changed ({similarity:.3f})"

    def _classify_semantic(
        self, baseline: str, quantized: str, prompt: str,
    ) -> tuple[DriftType, float, str]:
        similarity = self.semantic_verifier.similarity(baseline, quantized)
        if similarity > 0.95:
            return DriftType.NO_DRIFT, 0.0, f"Near-identical ({similarity:.3f})"
        if similarity > 0.85:
            return DriftType.BENIGN, 1.0 - similarity, f"Paraphrase ({similarity:.3f})"
        return DriftType.DANGEROUS, 1.0 - similarity, f"Significant drift ({similarity:.3f})"
