"""Generate sample results for demo/testing without running actual models."""

import json
import random
from pathlib import Path

random.seed(42)

CATEGORIES = ["math", "code", "translation", "summarization", "chat"]

SAMPLE_PROMPTS = {
    "math": [
        {"id": "math_001", "prompt": "What is 17 * 24?"},
        {"id": "math_002", "prompt": "Solve for x: 3x + 7 = 22"},
        {"id": "math_003", "prompt": "What is the square root of 144?"},
    ],
    "code": [
        {"id": "code_001", "prompt": "Write a Python function that returns the nth Fibonacci number."},
        {"id": "code_002", "prompt": "Write a Python function that checks if a string is a palindrome."},
        {"id": "code_003", "prompt": "Write a Python function that returns the factorial of n."},
    ],
    "translation": [
        {"id": "trans_001", "prompt": "Translate to French: The weather is beautiful today."},
        {"id": "trans_002", "prompt": "Translate to Spanish: I would like a cup of coffee, please."},
    ],
    "summarization": [
        {"id": "sum_001", "prompt": "Summarize in one sentence: Photosynthesis is the process..."},
        {"id": "sum_002", "prompt": "Summarize in one sentence: The Industrial Revolution was..."},
    ],
    "chat": [
        {"id": "chat_001", "prompt": "Explain the difference between a stack and a queue."},
        {"id": "chat_002", "prompt": "What are three benefits of regular exercise?"},
    ],
}

BASELINE_ANSWERS = {
    "math_001": "The answer is 408.",
    "math_002": "x = 5",
    "math_003": "The square root of 144 is 12.",
    "code_001": "def fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b",
    "code_002": "def is_palindrome(s):\n    return s == s[::-1]",
    "code_003": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)",
    "trans_001": "Le temps est magnifique aujourd'hui.",
    "trans_002": "Me gustaría una taza de café, por favor.",
    "sum_001": "Photosynthesis is the process where green plants use sunlight to convert carbon dioxide and water into food, producing oxygen as a byproduct.",
    "sum_002": "The Industrial Revolution was the shift from manual to machine-based manufacturing in the late 18th and early 19th centuries.",
    "chat_001": "A stack follows Last-In-First-Out (LIFO) while a queue follows First-In-First-Out (FIFO).",
    "chat_002": "Regular exercise improves cardiovascular health, boosts mental well-being, and helps maintain a healthy weight.",
}

QUANTIZED_DRIFTS = {
    "int8": {
        "math_001": "The answer is 408.",
        "math_002": "x = 5",
        "math_003": "The square root of 144 is 12.",
        "code_001": "def fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b",
        "code_002": "def is_palindrome(s):\n    return s == s[::-1]",
        "code_003": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)",
        "trans_001": "Le temps est beau aujourd'hui.",
        "trans_002": "Me gustaría una taza de café, por favor.",
        "sum_001": "Green plants use sunlight to make food from CO2 and water through photosynthesis, releasing oxygen.",
        "sum_002": "The Industrial Revolution marked the transition from hand production to machine manufacturing in the late 1700s and early 1800s.",
        "chat_001": "A stack is LIFO (last in, first out) and a queue is FIFO (first in, first out).",
        "chat_002": "Three benefits of exercise are better heart health, improved mood, and weight management.",
    },
    "int4": {
        "math_001": "The answer is 48.",
        "math_002": "x = 7",
        "math_003": "The square root of 144 is 12.",
        "code_001": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
        "code_002": "def is_palindrome(s):\n    s = s.lower()\n    return s == s[::-1]",
        "code_003": "def factorial(n):\n    result = 1\n    for i in range(1, n):\n        result *= i\n    return result",
        "trans_001": "Il fait beau temps aujourd'hui.",
        "trans_002": "Quiero un café, por favor.",
        "sum_001": "Plants make food from sunlight.",
        "sum_002": "The Industrial Revolution changed manufacturing from hand to machine processes.",
        "chat_001": "A stack is like a pile of plates (LIFO) and a queue is like a line at a store (FIFO).",
        "chat_002": "Exercise helps with heart health, mental health, and weight control.",
    },
}


def generate_results(config_name: str, answers: dict[str, str]) -> list[dict]:
    results = []
    for category, prompts in SAMPLE_PROMPTS.items():
        for p in prompts:
            output = answers.get(p["id"], "No output")
            results.append({
                "prompt_id": p["id"],
                "prompt_text": p["prompt"],
                "category": category,
                "config_name": config_name,
                "output": output,
                "latency_ms": round(random.uniform(200, 2000), 1),
                "tokens_generated": random.randint(20, 200),
            })
    return results


def main():
    output_dir = Path("results/llama-3.1-8b")
    output_dir.mkdir(parents=True, exist_ok=True)

    fp16_results = generate_results("fp16", BASELINE_ANSWERS)
    (output_dir / "fp16.json").write_text(json.dumps(fp16_results, indent=2))
    print(f"Generated {len(fp16_results)} results -> {output_dir}/fp16.json")

    for config_name, answers in QUANTIZED_DRIFTS.items():
        results = generate_results(config_name, answers)
        (output_dir / f"{config_name}.json").write_text(json.dumps(results, indent=2))
        print(f"Generated {len(results)} results -> {output_dir}/{config_name}.json")

    print("\nSample results ready for demo!")


if __name__ == "__main__":
    main()
