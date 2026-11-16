"""Verify code outputs: syntax check and functional comparison."""

import ast
import re


class CodeVerifier:
    def extract_code(self, text: str) -> str:
        """Extract code block from LLM output."""
        match = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text.strip()

    def check_syntax(self, text: str) -> bool:
        """Check if extracted code has valid Python syntax."""
        code = self.extract_code(text)
        try:
            ast.parse(code)
            return True
        except SyntaxError:
            return False

    def compare_outputs(self, baseline_text: str, quantized_text: str) -> bool:
        """Run both code snippets and compare outputs.

        Returns True if both produce the same output on test inputs.
        """
        baseline_code = self.extract_code(baseline_text)
        quantized_code = self.extract_code(quantized_text)

        test_inputs = [(), (0,), (1,), (5,), (10,), (-1,), (100,)]

        for args in test_inputs:
            baseline_result = self._safe_execute(baseline_code, args)
            quantized_result = self._safe_execute(quantized_code, args)
            if baseline_result != quantized_result:
                return False
        return True

    def _safe_execute(self, code: str, args: tuple, timeout_sec: float = 2.0) -> str | None:
        """Execute code safely and return output."""
        try:
            namespace: dict = {}
            exec(code, namespace)

            func_name = None
            for name, obj in namespace.items():
                if callable(obj) and not name.startswith("_"):
                    func_name = name
                    break

            if func_name is None:
                return None

            result = namespace[func_name](*args)
            return str(result)
        except Exception:
            return None
