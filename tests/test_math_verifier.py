import pytest

from analyzer.src.verifiers.math_verifier import MathVerifier

v = MathVerifier()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("17 * 24 = 408", 408.0),
        ("The answer is 12", 12.0),
        ("Answer: 3.5", 3.5),
        (r"So the total is \boxed{42}", 42.0),
        ("The result is **1,234**", 1234.0),
        ("= 3/4", 0.75),
        ("It costs -7", -7.0),
    ],
)
def test_extract_answer(text, expected):
    assert v.extract_answer(text) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        (r"Therefore:\[\boxed{\frac{3}{8}}\]", 0.375),
        (r"\boxed{\dfrac{3}{8}}", 0.375),
        (r"\boxed{\frac{-3}{8}}", -0.375),
        (r"We first get 375/1000 = 0.375, so \boxed{3/8}", 0.375),
        (r"\boxed{1,234}", 1234.0),
    ],
)
def test_boxed_answers_with_latex_fractions(text, expected):
    """Regression: \\boxed{\\frac{3}{8}} used to be cut at the first '}' and misread."""
    assert v.extract_answer(text) == pytest.approx(expected)


def test_boxed_answer_wins_over_earlier_numbers():
    text = r"\frac{375 \div 125}{1000 \div 125} = \frac{3}{8}" + "\n" + r"\boxed{\frac{3}{8}}"
    assert v.extract_answer(text) == pytest.approx(0.375)


def test_extract_answer_none_when_no_number():
    assert v.extract_answer("I do not know.") is None


def test_extract_answer_ignores_zero_denominator():
    assert v.extract_answer("= 5/0") is None


def test_last_number_pattern_takes_trailing_value():
    assert v.extract_answer("First we compute things.\nTotal 55") == 55.0


@pytest.mark.parametrize(
    ("a", "b", "ok"),
    [(1.0, 1.0, True), (0.0, 0.0, True), (100.0, 100.0000001, True), (408.0, 336.0, False), (0.0, 1.0, False)],
)
def test_answers_match(a, b, ok):
    assert v.answers_match(a, b) is ok


def test_extract_expression_strips_whitespace():
    assert v.extract_expression("This simplifies to x + 3.") == "x+3"


def test_extract_expression_ignores_plain_numbers():
    assert v.extract_expression("= 42") is None
