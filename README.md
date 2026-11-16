# QuantDrift

**Measuring How Quantization Breaks LLM Output**

Quantization (FP16 → INT8 → INT4) reduces model size and latency, but how much does it change the output? QuantDrift answers this per task type — so you know exactly which tasks are safe to quantize and which are not.

## The Problem

You quantize a model from FP16 to INT4. You test a few prompts, it "looks fine." You deploy.

Weeks later: math answers are wrong, code has bugs, but translations are fine. **Quantization doesn't break everything equally — but no tool tells you what breaks and what doesn't.**

## What QuantDrift Does

1. Runs the same prompt set across multiple quantization configs (FP16, INT8, INT4)
2. Compares outputs per prompt using task-specific verification
3. Classifies drift as **benign** (paraphrase) or **dangerous** (factual error, code bug)
4. Reports per-task drift profiles with specific examples
5. Recommends which quantization level is safe for which task

## Example Output

```
Task           Drift Rate   Dangerous   Verdict
─────────────  ──────────   ─────────   ───────
Math           31.2%        23.1%       🔴 UNSAFE for INT4
Code           18.3%        12.1%       🔴 UNSAFE for INT4
Translation     2.1%         0.3%       🟢 SAFE for INT4
Summarization   3.4%         0.5%       🟢 SAFE for INT4
Chat            5.7%         1.2%       🟡 CAUTION for INT4
```

## Quick Start

```bash
# Clone
git clone https://github.com/[your-username]/quant-drift.git
cd quant-drift

# Download model
bash scripts/download_model.sh llama-3.1-8b

# Run benchmark
docker compose up

# Or run directly
python runner/src/benchmark.py --model llama-3.1-8b --prompts prompts/

# View results
open http://localhost:3000
```

## Architecture

```
prompts/  ──→  runner/  ──→  results/  ──→  analyzer/  ──→  dashboard/
(500 prompts)  (inference     (raw outputs)  (drift          (heatmap,
                per config)                   classification)  examples)
```

## Project Structure

```
quant-drift/
├── runner/          # Run inference across quantization configs
├── analyzer/        # Compare outputs, classify drift
├── prompts/         # Prompt datasets (math, code, translation, etc.)
├── configs/         # Quantization configuration files
├── dashboard/       # React visualization
├── results/         # Pre-computed benchmark results
├── docs/            # Architecture, algorithm, benchmark report
└── scripts/         # Utility scripts
```

## Key Insight

Embedding similarity is not enough. `"391"` vs `"361"` has 0.95 similarity — but one is correct and the other is wrong. QuantDrift uses **task-specific verification**: math checks answers, code runs tests, translation back-translates.

## Supported Models

- Llama 3.1 (8B, 70B)
- Mistral 7B
- Phi-3
- Any GGUF/ONNX/HuggingFace model

## Supported Backends

- llama.cpp (GGUF)
- HuggingFace Transformers
- ONNX Runtime

## License

MIT
