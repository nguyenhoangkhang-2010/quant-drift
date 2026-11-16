"""Main benchmark runner: runs prompt set across quantization configs."""

import argparse
import json
import time
from pathlib import Path
from dataclasses import dataclass, asdict

from .config import load_config, QuantConfig


@dataclass
class InferenceResult:
    prompt_id: str
    prompt_text: str
    category: str
    config_name: str
    output: str
    latency_ms: float
    tokens_generated: int


def load_prompts(prompts_dir: Path) -> list[dict]:
    """Load all prompt files from directory."""
    prompts = []
    for file in sorted(prompts_dir.glob("*.jsonl")):
        category = file.stem
        with open(file) as f:
            for i, line in enumerate(f):
                entry = json.loads(line)
                entry["id"] = f"{category}-{i:04d}"
                entry["category"] = category
                prompts.append(entry)
    return prompts


def get_backend(config: QuantConfig):
    """Get inference backend based on config."""
    if config.backend == "llamacpp":
        from .backends.llamacpp import LlamaCppBackend
        return LlamaCppBackend(config)
    elif config.backend == "transformers":
        from .backends.transformers_backend import TransformersBackend
        return TransformersBackend(config)
    elif config.backend == "onnx":
        from .backends.onnx_backend import OnnxBackend
        return OnnxBackend(config)
    else:
        raise ValueError(f"Unknown backend: {config.backend}")


def run_benchmark(
    model_name: str,
    prompts_dir: Path,
    configs_dir: Path,
    output_dir: Path,
    temperature: float = 0.0,
    seed: int | None = None,
    max_tokens: int = 512,
):
    """Run all prompts through all quantization configs."""
    prompts = load_prompts(prompts_dir)
    print(f"Loaded {len(prompts)} prompts")

    config_files = sorted(configs_dir.glob("*.yaml"))
    print(f"Found {len(config_files)} configs")

    output_dir.mkdir(parents=True, exist_ok=True)

    for config_file in config_files:
        config = load_config(config_file, model_name)
        config_name = config_file.stem
        print(f"\n--- Running config: {config_name} ---")

        backend = get_backend(config)
        results = []

        for prompt in prompts:
            start = time.perf_counter()
            output = backend.generate(
                prompt["prompt"],
                max_tokens=max_tokens,
                temperature=temperature,
                seed=seed,
            )
            elapsed = (time.perf_counter() - start) * 1000

            result = InferenceResult(
                prompt_id=prompt["id"],
                prompt_text=prompt["prompt"],
                category=prompt["category"],
                config_name=config_name,
                output=output,
                latency_ms=round(elapsed, 2),
                tokens_generated=len(output.split()),
            )
            results.append(asdict(result))
            print(f"  [{config_name}] {prompt['id']}: {elapsed:.0f}ms")

        out_file = output_dir / f"{config_name}.json"
        with open(out_file, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"  Saved {len(results)} results to {out_file}")

        backend.unload()


def main():
    parser = argparse.ArgumentParser(description="QuantDrift Benchmark Runner")
    parser.add_argument("--model", required=True, help="Model name (e.g., llama-3.1-8b)")
    parser.add_argument("--prompts", default="prompts", help="Prompts directory")
    parser.add_argument("--configs", default="configs", help="Configs directory")
    parser.add_argument("--output", default="results", help="Output directory")
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--max-tokens", type=int, default=512)
    args = parser.parse_args()

    output_dir = Path(args.output) / args.model
    run_benchmark(
        model_name=args.model,
        prompts_dir=Path(args.prompts),
        configs_dir=Path(args.configs),
        output_dir=output_dir,
        temperature=args.temperature,
        seed=args.seed,
        max_tokens=args.max_tokens,
    )


if __name__ == "__main__":
    main()
