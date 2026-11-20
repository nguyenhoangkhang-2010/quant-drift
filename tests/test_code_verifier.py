from analyzer.src.verifiers.code_verifier import CodeVerifier

v = CodeVerifier()


def fenced(code: str) -> str:
    return f"Here you go:\n\n```python\n{code}\n```\n\nThis works."


def test_extract_code_from_fenced_block():
    assert v.extract_code(fenced("def f():\n    return 1")) == "def f():\n    return 1"


def test_extract_code_without_fence_starts_at_def():
    assert v.extract_code("Sure!\ndef f():\n    return 1").startswith("def f()")


def test_check_syntax():
    assert v.check_syntax(fenced("def f():\n    return 1"))
    assert not v.check_syntax(fenced("def f(:\n    return 1"))


def test_same_behavior_different_code():
    a = fenced("def double(n):\n    return n * 2")
    b = fenced("def double(n):\n    return n + n")
    assert v.compare_outputs(a, b)


def test_different_behavior_detected():
    a = fenced("def f(n):\n    return n * 2")
    b = fenced("def f(n):\n    return n * 3")
    assert not v.compare_outputs(a, b)


def test_string_functions_are_compared():
    """Regression: only numeric inputs were tried, so string functions never matched."""
    a = fenced("def count_vowels(s):\n    return sum(c in 'aeiouAEIOU' for c in s)")
    b = fenced("def count_vowels(s):\n    n = 0\n    for c in s:\n        if c.lower() in 'aeiou':\n            n += 1\n    return n")
    assert v.compare_outputs(a, b)
    wrong = fenced("def count_vowels(s):\n    return sum(c in 'aeio' for c in s)")
    assert not v.compare_outputs(a, wrong)


def test_list_and_two_argument_functions():
    a = fenced("def two_sum(nums, target):\n    for i, x in enumerate(nums):\n        for j in range(i + 1, len(nums)):\n            if x + nums[j] == target:\n                return [i, j]")
    b = fenced("def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i")
    assert v.compare_outputs(a, b)


def test_in_place_mutation_is_compared():
    returns_none = fenced("def reverse(xs):\n    xs.reverse()")
    returns_new = fenced("def reverse(xs):\n    xs.reverse()\n    return xs")
    sorts_wrong = fenced("def reverse(xs):\n    xs.sort()")
    assert not v.compare_outputs(returns_none, returns_new)  # different return value
    assert not v.compare_outputs(returns_new, sorts_wrong)  # different resulting list


def test_input_the_baseline_rejects_is_ignored():
    """The baseline is the reference: how quantized code treats inputs it can't handle is moot."""
    baseline = fenced("def f(s):\n    return s.upper()")  # raises on ints and lists
    quantized = fenced("def f(s):\n    return str(s).upper()")  # tolerates them, same on strings
    assert v.compare_outputs(baseline, quantized)


def test_quantized_that_breaks_on_valid_input_is_flagged():
    baseline = fenced("def f(n):\n    return n + 1")
    quantized = fenced("def f(n):\n    raise ValueError('nope')")
    assert not v.compare_outputs(baseline, quantized)


def test_runaway_code_times_out_and_is_not_equal():
    loop = fenced("def f(n):\n    while True:\n        pass")
    fast = fenced("def f(n):\n    return n")
    quick = CodeVerifier()
    quick.TIMEOUT_SEC = 1.0
    assert not quick.compare_outputs(fast, loop)


def test_nothing_runnable_falls_back_to_structure():
    needs_odd_input = fenced("def f(a, b, c, d):\n    return a")
    same_but_spaced = fenced("def f(a,   b, c, d):\n    return   a")
    different = fenced("def f(a, b, c, d):\n    return b")
    assert v.compare_outputs(needs_odd_input, same_but_spaced)
    assert not v.compare_outputs(needs_odd_input, different)


def test_snippet_without_function_is_not_equal():
    assert not v.compare_outputs(fenced("x = 1"), fenced("x = 2"))
