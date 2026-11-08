"""Which experts our agent work uses: the router's choices, and their weight, on the 27B's traces.
    moe_stats.py <model dir> <traces.jsonl> <out.json> [conversations]
Computed from each layer's router on its own input, so it does not depend on how the library runs the experts."""
import json
import random
import sys
import time

import torch
from transformers import AutoModelForImageTextToText, AutoTokenizer

model_dir, traces, out = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 160
tok = AutoTokenizer.from_pretrained(model_dir)
model = AutoModelForImageTextToText.from_pretrained(model_dir, dtype=torch.bfloat16, device_map="auto", max_memory={0: "21GiB", "cpu": "110GiB"})
model.eval()
cfg = model.config.text_config if hasattr(model.config, "text_config") else model.config
E, K = cfg.num_experts, cfg.num_experts_per_tok
layers = model.model.language_model.layers
count = torch.zeros(len(layers), E, dtype=torch.float64)
weight = torch.zeros(len(layers), E, dtype=torch.float64)
tokens = 0


def hook(i):
    def pre(module, args, kwargs):
        h = (args[0] if args else kwargs["hidden_states"]).reshape(-1, module.gate.weight.shape[1])
        logits = h.to(module.gate.weight.dtype) @ module.gate.weight.T
        probs = torch.softmax(logits.float(), dim=-1)
        top, idx = probs.topk(K, dim=-1)
        top = top / top.sum(-1, keepdim=True)
        count[i].index_add_(0, idx.flatten().cpu(), torch.ones(idx.numel(), dtype=torch.float64))
        weight[i].index_add_(0, idx.flatten().cpu(), top.flatten().double().cpu())
    return pre


for i, layer in enumerate(layers):
    layer.mlp.register_forward_pre_hook(hook(i), with_kwargs=True)

rows = [json.loads(line) for line in open(traces)]
random.seed(3)
random.shuffle(rows)
start = time.time()
for n, row in enumerate(rows[:N], 1):
    messages = [{k: v for k, v in m.items() if v is not None} for m in row["messages"]]
    for m in messages:
        for c in m.get("tool_calls") or []:
            if isinstance(c["function"].get("arguments"), str):
                c["function"]["arguments"] = json.loads(c["function"]["arguments"] or "{}")
    text = tok.apply_chat_template(messages, tools=row["tools"], tokenize=False, enable_thinking=False)
    ids = tok(text, return_tensors="pt", add_special_tokens=False)["input_ids"][:, :12000].to(model.device)
    with torch.no_grad():
        model(input_ids=ids, logits_to_keep=1)
    tokens += ids.shape[1]
    if n % 20 == 0:
        print(f"{n}/{N} conversations, {tokens} tokens, {int(time.time() - start)} s", flush=True)

json.dump({"experts": E, "top_k": K, "tokens": tokens, "count": count.tolist(), "weight": weight.tolist()}, open(out, "w"))
used = (count > 0).sum(1)
print("tokens", tokens, "experts ever chosen per layer: min", int(used.min()), "max", int(used.max()), "of", E)
share = weight / weight.sum(1, keepdim=True)
for keep in (0.5, 0.75):
    top = share.sort(dim=1, descending=True).values[:, : int(E * keep)].sum(1)
    print(f"keeping {int(keep * 100)} % of experts keeps {float(top.mean()) * 100:.1f} % of the routing weight (worst layer {float(top.min()) * 100:.1f} %)")
