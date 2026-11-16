"""Verify math answers: extract numeric answer and compare."""

import re


class MathVerifier:
    def extract_answer(self, text: str) -> float | None:
        """Extract the final numeric answer from LLM output."""
        patterns = [
            r"(?:the answer is|=|equals?)\s*(-?[\d,]+\.?\d*)",
            r"(-?[\d,]+\.?\d*)\s*$",
            r"\*\*(-?[\d,]+\.?\d*)\*\*",
            r"\\boxed\{(-?[\d,]+\.?\d*)\}",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(",", ""))
                except ValueError:
                    continue
        return None

    def answers_match(self, a: float, b: float, tolerance: float = 1e-6) -> bool:
        if a == b:
            return True
        if abs(a) > tolerance:
            return abs(a - b) / abs(a) < tolerance
        return abs(a - b) < tolerance
