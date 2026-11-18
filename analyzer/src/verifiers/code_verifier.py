"""Verify code outputs: syntax check and functional comparison."""

import ast
import json
import re
import subprocess
import sys

_RUNNER = r"""
import ast, json, sys
payload = json.load(sys.stdin)
try:
    tree = ast.parse(payload["code"])
    name = next((n.name for n in tree.body if isinstance(n, ast.FunctionDef)), None)
    if name is None:
        sys.exit(3)
    ns = {}
    exec(compile(tree, "<llm>", "exec"), ns)
    result = ns[name](*payload["args"])
    sys.stdout.write("\n" + json.dumps({"result": str(result)}))
except BaseException:
    sys.exit(2)
"""


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
        """Run the first function in `code` with `args` in a child process.

        A subprocess (unlike a thread) can be killed on timeout, so runaway
        code from a degraded model cannot keep burning CPU in the API process.
        """
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-c", _RUNNER],
                input=json.dumps({"code": code, "args": list(args)}),
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=self.TIMEOUT_SEC,
            )
        except subprocess.TimeoutExpired:
            return None

        if proc.returncode != 0:
            return None
        last_line = proc.stdout.rsplit("\n", 1)[-1]
        try:
            return json.loads(last_line)["result"]
        except (ValueError, KeyError):
            return None
