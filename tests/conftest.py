"""Shared fixtures. The embedding model is never loaded in tests: similarity is stubbed."""

import json
from pathlib import Path

import pytest

from analyzer.src.verifiers.semantic_verifier import SemanticVerifier

REPO_ROOT = Path(__file__).resolve().parent.parent


class Similarity:
    """Controls what the stubbed SemanticVerifier.similarity returns."""

    def __init__(self) -> None:
        self.value = 0.9
        self.calls = 0


@pytest.fixture(autouse=True)
def similarity(monkeypatch) -> Similarity:
    stub = Similarity()

    def fake(self, a: str, b: str) -> float:
        stub.calls += 1
        return stub.value

    monkeypatch.setattr(SemanticVerifier, "similarity", fake)
    return stub


def make_result(prompt_id: str, category: str, output: str, config: str = "fp16") -> dict:
    return {
        "prompt_id": prompt_id,
        "prompt_text": f"prompt for {prompt_id}",
        "category": category,
        "config_name": config,
        "output": output,
        "latency_ms": 10.0,
        "tokens_generated": 5,
    }


def write_results(model_dir: Path, config: str, rows: list[tuple[str, str, str]]) -> None:
    """Write results/<model>/<config>.json from (prompt_id, category, output) rows."""
    model_dir.mkdir(parents=True, exist_ok=True)
    data = [make_result(pid, cat, out, config) for pid, cat, out in rows]
    (model_dir / f"{config}.json").write_text(json.dumps(data), encoding="utf-8")


@pytest.fixture
def results_dir(tmp_path) -> Path:
    """A results/ tree with one model: fp16 baseline plus an int8 config."""
    model_dir = tmp_path / "toy-model"
    write_results(model_dir, "fp16", [
        ("math_001", "math", "17 * 24 = 408"),
        ("math_002", "math", "The answer is 12"),
        ("code_001", "code", "```python\ndef double(n):\n    return n * 2\n```"),
        ("chat_001", "chat", "A stack is LIFO and a queue is FIFO."),
        ("trans_001", "translation", "Bonjour le monde"),
    ])
    write_results(model_dir, "int8", [
        ("math_001", "math", "17 * 24 = 336"),
        ("math_002", "math", "The answer is 12"),
        ("code_001", "code", "```python\ndef double(n):\n    return n + n\n```"),
        ("chat_001", "chat", "A stack is LIFO and a queue is FIFO."),
        ("trans_001", "translation", "Salut le monde"),
    ])
    return tmp_path
