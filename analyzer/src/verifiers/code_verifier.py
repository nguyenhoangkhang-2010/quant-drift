"""Verify code outputs: syntax check and functional comparison."""

import ast
import json
import re
import subprocess
import sys

# Runs the first top-level function of the snippet on every argument list in one
# process. Each call yields its return value plus the (possibly mutated) arguments,
# so in-place algorithms (sorting, reversing) are compared too. A call that raises
# yields null for that input.
_RUNNER = r"""
import ast, copy, json, sys
payload = json.load(sys.stdin)
try:
    tree = ast.parse(payload["code"])
    name = next((n.name for n in tree.body if isinstance(n, ast.FunctionDef)), None)
    if name is None:
        sys.exit(3)
    ns = {}
    exec(compile(tree, "<llm>", "exec"), ns)
except BaseException:
    sys.exit(2)

results = []
for args in payload["args_list"]:
    args = copy.deepcopy(args)
    try:
        out = ns[name](*args)
        results.append([str(out), str(args)])
    except BaseException:
        results.append(None)
sys.stdout.write("\n" + json.dumps(results))
"""

# Argument lists covering the shapes the benchmark prompts ask for: numbers, strings,
# (nested) lists and two-argument functions. Inputs a function cannot accept just
# raise on both sides and are skipped.
TEST_INPUTS: list[list] = [
    [], [0], [1], [5], [7], [10], [17], [100],
    [""], ["racecar"], ["hello world"], ["A man, a plan, a canal: Panama"],
    [[1, 2, 3, 4, 5]], [[64, 34, 25, 12, 22, 11, 90]], [[[1, 2], [3, [4, 5]], 6]],
    [[2, 7, 11, 15], 9], [48, 18], [12, 8],
]


class CodeVerifier:
    TIMEOUT_SEC = 5.0

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

        baseline_results = self._run_all(baseline_code)
        quantized_results = self._run_all(quantized_code)

        matched = 0
        for baseline_result, quantized_result in zip(baseline_results, quantized_results):
            if baseline_result is None:
                # The baseline is the reference: an input it cannot handle is not a
                # valid input for this task, so how the quantized code treats it is moot.
                continue
            if baseline_result != quantized_result:
                return False
            matched += 1

        if matched > 0:
            return True
        # Nothing was runnable on either side (e.g. the function needs an input shape
        # we do not generate): fall back to comparing the code structurally.
        return self._same_structure(baseline_code, quantized_code)

    @staticmethod
    def _same_structure(a: str, b: str) -> bool:
        try:
            return ast.dump(ast.parse(a)) == ast.dump(ast.parse(b))
        except SyntaxError:
            return False

    def _run_all(self, code: str) -> list:
        """Run the first function in `code` on every test input in a child process.

        A subprocess (unlike a thread) can be killed on timeout, so runaway
        code from a degraded model cannot keep burning CPU in the API process.
        Returns one entry per test input: [return value, args after the call] or None.
        """
        nothing = [None] * len(TEST_INPUTS)
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-c", _RUNNER],
                input=json.dumps({"code": code, "args_list": TEST_INPUTS}),
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=self.TIMEOUT_SEC,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return nothing

        if proc.returncode != 0:
            return nothing
        last_line = proc.stdout.rsplit("\n", 1)[-1]
        try:
            results = json.loads(last_line)
        except ValueError:
            return nothing
        return results if len(results) == len(TEST_INPUTS) else nothing
