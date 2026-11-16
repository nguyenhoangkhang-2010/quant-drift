"""HuggingFace Transformers backend."""

import torch
from ..config import QuantConfig


class TransformersBackend:
    def __init__(self, config: QuantConfig):
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        quantization_config = None
        if config.quantization == "int8":
            quantization_config = BitsAndBytesConfig(load_in_8bit=True)
        elif config.quantization == "int4":
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
            )

        self.tokenizer = AutoTokenizer.from_pretrained(config.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            config.model_name,
            quantization_config=quantization_config,
            device_map=config.device,
            torch_dtype=torch.float16 if config.dtype == "float16" else torch.float32,
        )

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.0,
        seed: int | None = None,
    ) -> str:
        if seed is not None:
            torch.manual_seed(seed)

        messages = [{"role": "user", "content": prompt}]
        input_text = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True,
        )
        inputs = self.tokenizer(input_text, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature if temperature > 0 else None,
                do_sample=temperature > 0,
            )

        new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
        return self.tokenizer.decode(new_tokens, skip_special_tokens=True)

    def unload(self):
        del self.model
        del self.tokenizer
        torch.cuda.empty_cache()
