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

    _LATEX_FRAC = re.compile(r"^(-?)\\[dt]?frac\{\s*(-?[\d.]+)\s*\}\{\s*(-?[\d.]+)\s*\}$")

    @staticmethod
    def _last_boxed(text: str) -> str | None:
        """Content of the last \\boxed{...}, with balanced braces (so \\frac{3}{8} survives)."""
        start = text.rfind("boxed{")
        if start == -1:
            return None
        i = start + len("boxed{")
        depth, begin = 1, i
        while i < len(text):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    return text[begin:i].strip()
            i += 1
        return None

    def _parse_number(self, raw: str) -> float | None:
        """Parse '42', '1,234', '3/4' or '\\frac{3}{8}' into a float."""
        raw = raw.replace(",", "").replace("$", "").strip()
        frac = self._LATEX_FRAC.match(raw)
        try:
            if frac:
                sign = -1.0 if frac.group(1) else 1.0
                return sign * float(frac.group(2)) / float(frac.group(3))
            if "/" in raw:
                parts = raw.split("/")
                if len(parts) == 2:
                    return float(parts[0]) / float(parts[1])
            return float(raw)
        except (ValueError, ZeroDivisionError):
            return None

    def extract_answer(self, text: str) -> float | None:
        """Extract the final numeric answer from LLM output."""
        boxed = self._last_boxed(text)
        if boxed is not None:
            value = self._parse_number(boxed)
            if value is not None:
                return value

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
