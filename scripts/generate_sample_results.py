"""Generate sample results for demo/testing without running actual models.

Creates realistic-looking benchmark outputs for two models (llama-3.1-8b,
mistral-7b) across fp16/int8/int4 configs. Outputs land in results/ and
can be analyzed by the dashboard immediately.
"""

import json
import random
from pathlib import Path

random.seed(42)

LATENCY_RANGES = {
    "fp16": (800, 2500),
    "int8": (400, 1500),
    "int4": (200, 900),
}

# --- Baseline (FP16) answers per prompt ID ---

BASELINE = {
    "math_001": "Let me calculate: 17 * 24 = 17 * 20 + 17 * 4 = 340 + 68 = 408. The answer is 408.",
    "math_002": "3x + 7 = 22\n3x = 15\nx = 5",
    "math_003": "The square root of 144 is 12.",
    "math_004": "15% of 240 = 0.15 * 240 = 36. The answer is 36.",
    "math_005": "2^10 = 1024.",
    "math_006": "A 3-4-5 triangle is a right triangle. Area = (1/2) * 3 * 4 = 6.",
    "math_007": "Sum = n(n+1)/2 = 10*11/2 = 55. The answer is 55.",
    "math_008": "(x^2 - 9) / (x - 3) = (x-3)(x+3) / (x-3) simplifies to x + 3.",
    "math_009": "7! = 7 * 6 * 5 * 4 * 3 * 2 * 1 = 5040.",
    "math_010": "0.375 = 375/1000 = 3/8.",
    "code_001": "```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n```",
    "code_002": "```python\ndef is_palindrome(s):\n    return s == s[::-1]\n```",
    "code_003": "```python\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n```",
    "code_004": "```python\ndef reverse_list(lst):\n    lst.reverse()\n    return lst\n```",
    "code_005": "```python\ndef two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        complement = target - n\n        if complement in seen:\n            return [seen[complement], i]\n        seen[n] = i\n    return []\n```",
    "code_006": "```python\ndef count_vowels(s):\n    return sum(1 for c in s.lower() if c in 'aeiou')\n```",
    "code_007": "```python\ndef gcd(a, b):\n    while b:\n        a, b = b, a % b\n    return a\n```",
    "code_008": "```python\ndef flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result\n```",
    "code_009": "```python\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n```",
    "code_010": "```python\ndef bubble_sort(lst):\n    n = len(lst)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if lst[j] > lst[j + 1]:\n                lst[j], lst[j + 1] = lst[j + 1], lst[j]\n    return lst\n```",
    "trans_001": "Le temps est magnifique aujourd'hui.",
    "trans_002": "Me gustaría una taza de café, por favor.",
    "trans_003": "Das Buch liegt auf dem Tisch.",
    "trans_004": "おはようございます、お元気ですか？",
    "trans_005": "A tecnologia está mudando o mundo rapidamente.",
    "trans_006": "Dov'è la stazione ferroviaria più vicina?",
    "trans_007": "머신 러닝은 인공 지능의 하위 분야입니다.",
    "trans_008": "会议将于下周一举行。",
    "trans_009": "Пожалуйста, отправьте мне отчет до пятницы.",
    "trans_010": "Khoa học dữ liệu đòi hỏi nền tảng toán học vững chắc.",
    "sum_001": "Photosynthesis is the process where green plants use sunlight to convert carbon dioxide and water into food, producing oxygen as a byproduct.",
    "sum_002": "The Industrial Revolution was the shift from manual to machine-based manufacturing in the late 18th and early 19th centuries.",
    "sum_003": "TCP/IP is the fundamental communication protocol of the Internet that enables computers to send and receive data.",
    "sum_004": "The Great Wall of China is a series of ancient fortifications built to protect against northern nomadic invasions, with most existing sections dating from the Ming Dynasty.",
    "sum_005": "Machine learning automates analytical model building by enabling systems to learn from data and make decisions without explicit programming.",
    "chat_001": "A stack follows Last-In-First-Out (LIFO) — the last element added is the first removed, like a stack of plates. A queue follows First-In-First-Out (FIFO) — the first element added is the first removed, like a line at a store.",
    "chat_002": "Three benefits of regular exercise are: improved cardiovascular health, boosted mental well-being and mood, and better weight management.",
    "chat_003": "Binary search works by repeatedly dividing a sorted array in half. Compare the target with the middle element: if equal, found it; if less, search the left half; if greater, search the right half. Time complexity is O(log n).",
    "chat_004": "HTTP transfers data in plain text, while HTTPS encrypts the data using TLS/SSL. HTTPS protects against eavesdropping and man-in-the-middle attacks.",
    "chat_005": "Docker containers are lightweight, isolated environments that package an application with its dependencies. They're useful for consistent deployments, easy scaling, and avoiding 'works on my machine' problems.",
    "chat_006": "SOLID stands for: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. These principles help create maintainable, flexible object-oriented code.",
    "chat_007": "The CAP theorem states that a distributed system can only guarantee two of three properties: Consistency, Availability, and Partition tolerance. Since network partitions are inevitable, you must choose between consistency and availability.",
    "chat_008": "SQL databases are relational, use structured schemas, and support ACID transactions. NoSQL databases are non-relational, have flexible schemas, and prioritize scalability and performance for specific data models.",
    "chat_009": "An API gateway is a single entry point for all client requests to backend microservices. Use one when you need request routing, rate limiting, authentication, or protocol translation across multiple services.",
    "chat_010": "Eventual consistency means that after a write, all replicas will eventually converge to the same value, but reads may return stale data temporarily. It's acceptable when immediate consistency isn't critical, like social media feeds or product catalogs.",
}

# --- INT8 drifts: mostly identical or benign paraphrase ---

INT8_OVERRIDES = {
    "trans_001": "Le temps est beau aujourd'hui.",
    "trans_003": "Das Buch ist auf dem Tisch.",
    "trans_006": "Dov'è la stazione dei treni più vicina?",
    "sum_001": "Green plants use sunlight to make food from CO2 and water through photosynthesis, releasing oxygen.",
    "sum_002": "The Industrial Revolution marked the transition from hand production to machine manufacturing in the late 1700s and early 1800s.",
    "chat_001": "A stack is LIFO (last in, first out) and a queue is FIFO (first in, first out). Think of a stack as plates and a queue as a waiting line.",
    "chat_002": "Three benefits of exercise are better heart health, improved mood, and weight management.",
    "chat_007": "CAP theorem: a distributed system can provide at most two of Consistency, Availability, and Partition tolerance simultaneously. You typically choose CP or AP.",
}

# --- INT4 drifts: more dangerous changes ---

INT4_OVERRIDES = {
    "math_001": "Let me calculate: 17 * 24. That's 17 * 20 + 17 * 4 = 340 + 68. The answer is 48.",
    "math_002": "3x + 7 = 22\n3x = 21\nx = 7",
    "math_004": "15% of 240 = 0.15 * 240 = 34. The answer is 34.",
    "math_007": "Sum = n(n+1)/2 = 10*11/2 = 50. The answer is 50.",
    "math_009": "7! = 7 * 6 * 5 * 4 * 3 * 2 = 2520.",
    "code_001": "```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n```",
    "code_003": "```python\ndef factorial(n):\n    result = 1\n    for i in range(1, n):\n        result *= i\n    return result\n```",
    "code_005": "```python\ndef two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []\n```",
    "code_009": "```python\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, n):\n        if n % i == 0:\n            return False\n    return True\n```",
    "trans_001": "Il fait beau temps aujourd'hui.",
    "trans_002": "Quiero un café, por favor.",
    "trans_005": "A tecnologia muda o mundo.",
    "trans_008": "会议下周举行。",
    "sum_001": "Plants make food from sunlight.",
    "sum_003": "TCP/IP is a computer protocol.",
    "sum_005": "Machine learning is a type of AI.",
    "chat_001": "A stack is like a pile of plates (LIFO) and a queue is like a line at a store (FIFO).",
    "chat_003": "Binary search divides the array in half each time to find the target element.",
    "chat_007": "The CAP theorem is about databases. It says you can have consistency or availability but not both.",
    "chat_010": "Eventual consistency means the data will be consistent eventually. It's used in distributed systems.",
}


def load_prompts_from_jsonl(prompts_dir: Path) -> list[dict]:
    prompts = []
    for file in sorted(prompts_dir.glob("*.jsonl")):
        with open(file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    if "category" not in entry:
                        entry["category"] = file.stem
                    prompts.append(entry)
    return prompts


def generate_config_results(
    prompts: list[dict],
    config_name: str,
    answers: dict[str, str],
) -> list[dict]:
    lo, hi = LATENCY_RANGES.get(config_name, (500, 1500))
    results = []
    for p in prompts:
        pid = p["id"]
        output = answers.get(pid, BASELINE.get(pid, "No output available."))
        results.append({
            "prompt_id": pid,
            "prompt_text": p["prompt"],
            "category": p["category"],
            "config_name": config_name,
            "output": output,
            "latency_ms": round(random.uniform(lo, hi), 1),
            "tokens_generated": random.randint(20, 200),
        })
    return results


def write_model_results(model_name: str, prompts: list[dict]):
    output_dir = Path("results") / model_name
    output_dir.mkdir(parents=True, exist_ok=True)

    int8_answers = {**BASELINE, **INT8_OVERRIDES}
    int4_answers = {**BASELINE, **INT4_OVERRIDES}

    for config_name, answers in [("fp16", BASELINE), ("int8", int8_answers), ("int4", int4_answers)]:
        results = generate_config_results(prompts, config_name, answers)
        out_file = output_dir / f"{config_name}.json"
        out_file.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  {config_name}: {len(results)} results -> {out_file}")


def main():
    prompts_dir = Path("prompts")
    if not prompts_dir.exists():
        print("Error: prompts/ directory not found. Run from project root.")
        return

    prompts = load_prompts_from_jsonl(prompts_dir)
    print(f"Loaded {len(prompts)} prompts from {prompts_dir}/\n")

    for model in ["llama-3.1-8b", "mistral-7b"]:
        print(f"=== {model} ===")
        write_model_results(model, prompts)
        print()

    print("Sample results ready! Start the analyzer:")
    print("  docker compose up analyzer dashboard")
    print("  # or: uvicorn analyzer.src.api:app --reload")


if __name__ == "__main__":
    main()
