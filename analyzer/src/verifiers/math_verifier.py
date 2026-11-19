"""Verify math answers: extract numeric answer and compare."""

import re
from typing import ClassVar


class MathVerifier:
    ANSWER_PATTERNS: ClassVar[list[str]] = [
        r"\\boxed\{([^}]+)\}",
        r"boxed\{([^}]+)\}",
        r"(?:the answer is|answer:)\s*[*]*(-?[\d,]+\.?\d*/?\.?\d*)[*]*",
        r"(?:equals?|=)\s*[*]*(-?[\d,]+\.?\d*/?\.?\d*)[*]*",
        r"\*\*(-?[\d,]+\.?\d*/?\.?\d*)\*\*\s*$",
        r"(-?[\d,]+\.?\d*/?\.?\d*)\s*$",
    ]

    EXPRESSION_PATTERNS: ClassVar[list[str]] = [
        r"(?:simplifies? to|equals?|=)\s*(.+?)(?:\.|$)",
        r"\\boxed\{(.+?)\}",
        r"boxed\{(.+?)\}",
    ]

    def extract_answer(self, text: str) -> float | None:
        """Extract the final numeric answer from LLM output."""
        for pattern in self.ANSWER_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                raw = match.group(1).strip().replace(",", "")
                try:
                    if "/" in raw:
                        parts = raw.split("/")
                        if len(parts) == 2:
                            return float(parts[0]) / float(parts[1])
                    return float(raw)
                except (ValueError, ZeroDivisionError):
                    continue
        return None

    def extract_expression(self, text: str) -> str | None:
        """Extract a symbolic expression (e.g. 'x + 3') from LLM output."""
        for pattern in self.EXPRESSION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                expr = match.group(1).strip()
                expr = re.sub(r"\s+", "", expr)
                if expr and not expr.replace(".", "").replace("-", "").isdigit():
                    return expr
        return None

    def answers_match(self, a: float, b: float, tolerance: float = 1e-6) -> bool:
        if a == b:
            return True
        if abs(a) > tolerance:
            return abs(a - b) / abs(a) < tolerance
        return abs(a - b) < tolerance
