"""Download the FP16, Q8_0 and Q4_K_M GGUF files of a model as models/<name>/{fp16,int8,int4}.gguf."""

import argparse
import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

# name -> (Hugging Face repo, {config: file in that repo}). Add a model by adding one entry.
PRESETS = {
    "qwen2.5-1.5b": (
        "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        {
            "fp16": "qwen2.5-1.5b-instruct-fp16.gguf",
            "int8": "qwen2.5-1.5b-instruct-q8_0.gguf",
            "int4": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        },
    ),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("name", choices=sorted(PRESETS), help="model preset")
    parser.add_argument("--only", default="fp16,int8,int4", help="comma-separated configs to download")
    parser.add_argument("--models-dir", default="models")
    args = parser.parse_args()

    repo, files = PRESETS[args.name]
    wanted = [c.strip() for c in args.only.split(",") if c.strip()]
    unknown = [c for c in wanted if c not in files]
    if unknown:
        sys.exit(f"Unknown config(s): {unknown}. Choose from: {sorted(files)}")

    target = Path(args.models_dir) / args.name
    target.mkdir(parents=True, exist_ok=True)

    for config in wanted:
        dest = target / f"{config}.gguf"
        if dest.exists():
            print(f"{config}: already present ({dest.stat().st_size / 1e9:.2f} GB), skipping")
            continue
        print(f"{config}: downloading {files[config]} from {repo}")
        downloaded = hf_hub_download(repo_id=repo, filename=files[config], local_dir=target)
        Path(downloaded).replace(dest)
        print(f"{config}: saved {dest} ({dest.stat().st_size / 1e9:.2f} GB)")


if __name__ == "__main__":
    main()
