"""Verify code outputs: syntax check and functional comparison."""

import ast
import re
import threading


class CodeVerifier:
    TIMEOUT_SEC = 2.0

    def extract_code(self, text: str) -> str:
        """Extract code block from LLM output."""
        match = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        lines = [l for l in text.strip().splitlines()
                 if not l.strip().startswith("#") or l.strip().startswith("def ")]
        if any("def " in l for l in lines):
            start = next(i for i, l in enumerate(lines) if "def " in l)
            return "\n".join(lines[start:]).strip()
        return text.strip()

    def check_syntax(self, text: str) -> bool:
        """Check if extracted code has valid Python syntax."""
        code = self.extract_code(text)
        try:
            ast.parse(code)
            return True
        except SyntaxError:
            return False

    def _find_function(self, namespace: dict) -> str | None:
        """Find the first user-defined function in namespace."""
        tree = None
        for name, obj in namespace.items():
            if callable(obj) and not name.startswith("_") and name not in dir(__builtins__):
                return name
        return None

    def compare_outputs(self, baseline_text: str, quantized_text: str) -> bool:
        """Run both code snippets and compare outputs on test inputs."""
        baseline_code = self.extract_code(baseline_text)
        quantized_code = self.extract_code(quantized_text)

        test_inputs = [(), (0,), (1,), (5,), (10,), (100,)]
        matched = 0

        for args in test_inputs:
            baseline_result = self._safe_execute(baseline_code, args)
            quantized_result = self._safe_execute(quantized_code, args)
            if baseline_result is None and quantized_result is None:
                continue
            if baseline_result != quantized_result:
                return False
            matched += 1

        return matched > 0

    def _safe_execute(self, code: str, args: tuple) -> str | None:
        """Execute code in a thread with timeout."""
        result_box: list = []
        error_box: list = []

        def run():
            try:
                namespace: dict = {"__builtins__": __builtins__}
                exec(code, namespace)
                func_name = self._find_function(namespace)
                if func_name is None:
                    return
                r = namespace[func_name](*args)
                result_box.append(str(r))
            except Exception as e:
                error_box.append(e)

        t = threading.Thread(target=run, daemon=True)
        t.start()
        t.join(timeout=self.TIMEOUT_SEC)

        if t.is_alive() or error_box or not result_box:
            return None
        return result_box[0]
