"""Main benchmark runner: runs prompt set across quantization configs."""

import argparse
import json
import sys
import time
from pathlib import Path
from dataclasses import dataclass, asdict

from tqdm import tqdm

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
        with open(file, encoding="utf-8") as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                entry = json.loads(line)
                if "id" not in entry:
                    entry["id"] = f"{file.stem}_{i:03d}"
                if "category" not in entry:
                    entry["category"] = file.stem
                prompts.append(entry)
    return prompts


def get_backend(config: QuantConfig):
    """Get inference backend based on config."""
    backends = {
        "llamacpp": (".backends.llamacpp", "LlamaCppBackend"),
        "transformers": (".backends.transformers_backend", "TransformersBackend"),
        "onnx": (".backends.onnx_backend", "OnnxBackend"),
    }
    if config.backend not in backends:
        raise ValueError(f"Unknown backend: {config.backend}. Choose from: {list(backends)}")

    module_path, class_name = backends[config.backend]
    import importlib
    module = importlib.import_module(module_path, package=__package__)
    return getattr(module, class_name)(config)


def resolve_configs(configs_path: Path) -> list[Path]:
    """Resolve configs argument: single file or directory."""
    if configs_path.is_file():
        return [configs_path]
    if configs_path.is_dir():
        files = sorted(configs_path.glob("*.yaml"))
        if not files:
            raise FileNotFoundError(f"No .yaml files found in {configs_path}")
        return files
    raise FileNotFoundError(f"Config path not found: {configs_path}")


def run_benchmark(
    model_name: str,
    prompts_dir: Path,
    configs_path: Path,
    output_dir: Path,
    temperature: float = 0.0,
    seed: int | None = None,
    max_tokens: int = 512,
):
    """Run all prompts through all quantization configs."""
    prompts = load_prompts(prompts_dir)
    print(f"Loaded {len(prompts)} prompts from {prompts_dir}")

    config_files = resolve_configs(configs_path)
    print(f"Configs: {[f.stem for f in config_files]}")

    output_dir.mkdir(parents=True, exist_ok=True)

    for config_file in config_files:
        config = load_config(config_file, model_name)
        config_name = config_file.stem
        print(f"\n{'='*50}")
        print(f"Config: {config_name} | Backend: {config.backend} | Quantization: {config.quantization}")
        print(f"{'='*50}")

        backend = get_backend(config)
        results = []
        errors = 0

        for prompt in tqdm(prompts, desc=config_name, unit="prompt"):
            try:
                start = time.perf_counter()
                output, token_count = backend.generate(
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
                    tokens_generated=token_count,
                )
                results.append(asdict(result))
            except Exception as e:
                errors += 1
                tqdm.write(f"  ERROR [{prompt['id']}]: {e}")
                results.append(asdict(InferenceResult(
                    prompt_id=prompt["id"],
                    prompt_text=prompt["prompt"],
                    category=prompt["category"],
                    config_name=config_name,
                    output=f"ERROR: {e}",
                    latency_ms=0,
                    tokens_generated=0,
                )))

        out_file = output_dir / f"{config_name}.json"
        with open(out_file, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        total_latency = sum(r["latency_ms"] for r in results)
        total_tokens = sum(r["tokens_generated"] for r in results)
        print(f"\n  Results: {len(results)} prompts | {errors} errors")
        print(f"  Latency: {total_latency:.0f}ms total | {total_latency/len(results):.0f}ms avg")
        print(f"  Tokens: {total_tokens} total | Saved to {out_file}")

        backend.unload()

    print(f"\nBenchmark complete. Results in {output_dir}/")


def main():
    parser = argparse.ArgumentParser(description="QuantDrift Benchmark Runner")
    parser.add_argument("--model", required=True, help="HuggingFace model ID or local path")
    parser.add_argument("--prompts", default="prompts", help="Prompts directory with .jsonl files")
    parser.add_argument("--configs", default="configs", help="Config file or directory with .yaml files")
    parser.add_argument("--output", default="results", help="Output directory")
    parser.add_argument("--temperature", type=float, default=0.0, help="Sampling temperature (0 = greedy)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--max-tokens", type=int, default=512, help="Max tokens to generate")
    args = parser.parse_args()

    prompts_dir = Path(args.prompts)
    if not prompts_dir.exists():
        print(f"Error: prompts directory not found: {prompts_dir}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output) / args.model
    run_benchmark(
        model_name=args.model,
        prompts_dir=prompts_dir,
        configs_path=Path(args.configs),
        output_dir=output_dir,
        temperature=args.temperature,
        seed=args.seed,
        max_tokens=args.max_tokens,
    )


if __name__ == "__main__":
    main()
