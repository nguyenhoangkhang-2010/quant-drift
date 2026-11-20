import pytest

from analyzer.src.classifier import DriftClassifier, DriftType

c = DriftClassifier()


def classify(category, baseline, quantized):
    return c.classify(category, baseline, quantized, "prompt")


def fenced(code: str) -> str:
    return f"```python\n{code}\n```"


@pytest.mark.parametrize("category", ["math", "code", "chat", "translation", "summarization"])
def test_identical_output_is_no_drift(category):
    drift, severity, _ = classify(category, "same text ", "same text")
    assert drift == DriftType.NO_DRIFT
    assert severity == 0.0


def test_math_wrong_answer_is_dangerous():
    drift, severity, why = classify("math", "17 * 24 = 408", "17 * 24 = 336")
    assert drift == DriftType.DANGEROUS
    assert severity == 1.0
    assert "408" in why and "336" in why


def test_math_same_answer_different_wording_is_benign():
    drift, _, _ = classify("math", "So 17 * 24 = 408", "Multiplying gives 17 * 24 = 408")
    assert drift == DriftType.BENIGN


def test_math_without_number_uses_similarity(similarity):
    similarity.value = 0.97
    assert classify("math", "It is undefined.", "That is undefined!")[0] == DriftType.BENIGN
    similarity.value = 0.5
    assert classify("math", "It is undefined.", "Totally different")[0] == DriftType.DANGEROUS


def test_code_syntax_error_in_quantized_is_dangerous():
    drift, _, why = classify("code", fenced("def f():\n    return 1"), fenced("def f(:\n    return 1"))
    assert drift == DriftType.DANGEROUS
    assert "syntax" in why.lower()


def test_code_same_behavior_is_benign():
    drift, _, _ = classify("code", fenced("def f(n):\n    return n * 2"), fenced("def f(n):\n    return n + n"))
    assert drift == DriftType.BENIGN


def test_code_different_behavior_is_dangerous():
    drift, _, _ = classify("code", fenced("def f(n):\n    return n * 2"), fenced("def f(n):\n    return n * 3"))
    assert drift == DriftType.DANGEROUS


@pytest.mark.parametrize(
    ("sim", "expected"),
    [(0.99, DriftType.NO_DRIFT), (0.9, DriftType.BENIGN), (0.5, DriftType.DANGEROUS)],
)
def test_translation_similarity_bands(similarity, sim, expected):
    similarity.value = sim
    assert classify("translation", "Bonjour", "Salut")[0] == expected


@pytest.mark.parametrize("category", ["chat", "summarization"])
@pytest.mark.parametrize(
    ("sim", "expected"),
    [(0.99, DriftType.NO_DRIFT), (0.9, DriftType.BENIGN), (0.3, DriftType.DANGEROUS)],
)
def test_semantic_categories(similarity, category, sim, expected):
    similarity.value = sim
    assert classify(category, "text a", "text b")[0] == expected


def test_unknown_category_falls_back_to_semantic(similarity):
    similarity.value = 0.99
    assert classify("poetry", "a", "b")[0] == DriftType.NO_DRIFT
