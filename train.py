"""LoRA on the small model's text layers: only the model's answers are learned from. No fixed token cap:
samples are as long as they are; a batch is one sample, gradient accumulated.
    train.py <data dir> <out dir> [learning rate] [max samples]"""
import json
import os
import math
import random
import sys
import time
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForImageTextToText, AutoTokenizer

BASE = os.environ.get('BASE', 'base/Qwen3.5-4B')
data, out = Path(sys.argv[1]), Path(sys.argv[2])
LR = float(sys.argv[3]) if len(sys.argv) > 3 else 2e-4
LIMIT = int(sys.argv[4]) if len(sys.argv) > 4 else 0
ACCUM = 8

tok = AutoTokenizer.from_pretrained(BASE)
model = AutoModelForImageTextToText.from_pretrained(BASE, dtype=torch.bfloat16, device_map={'': 0}, attn_implementation='sdpa')
model.config.use_cache = False
model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
model.enable_input_require_grads()
model = get_peft_model(model, LoraConfig(r=32, lora_alpha=32, lora_dropout=0.0, bias='none', target_modules=r'.*language_model.*\.(q_proj|k_proj|v_proj|o_proj|up_proj|down_proj|gate_proj)'))
model.print_trainable_parameters()


def encode(row):
    p = tok(row['prompt'], add_special_tokens=False)['input_ids']
    c = tok(row['completion'], add_special_tokens=False)['input_ids']
    return torch.tensor([p + c], device='cuda'), torch.tensor(c, device='cuda')


def loss_of(ids, answer):
    logits = model(input_ids=ids, logits_to_keep=len(answer) + 1).logits[0, :-1]
    return torch.nn.functional.cross_entropy(logits, answer)


train = [json.loads(line) for line in open(data / 'train.jsonl')]
valid = [json.loads(line) for line in open(data / 'valid.jsonl')]
random.seed(11)
random.shuffle(train)
# What the card can hold: a sample longer than this does not fit a 24 GB card with this model, and
# ran it out of memory half-way through a run. Counted, not hidden.
FITS = int(os.environ.get('FITS_TOKENS', '14000'))
size = lambda row: len(tok(row['prompt'] + row['completion'], add_special_tokens=False)['input_ids'])
before = len(train)
train = [row for row in train if size(row) <= FITS]
valid = [row for row in valid if size(row) <= FITS]
print('left out as too long for the card:', before - len(train), 'of', before, flush=True)
if LIMIT:
    train = train[:LIMIT]
random.shuffle(valid)
valid = valid[:120]
params = [p for p in model.parameters() if p.requires_grad]
optim = torch.optim.AdamW(params, lr=LR, weight_decay=0.0)
steps = len(train) // ACCUM
warm = max(1, steps // 20)
sched = torch.optim.lr_scheduler.LambdaLR(optim, lambda s: min(1, (s + 1) / warm) * 0.5 * (1 + math.cos(math.pi * min(1, s / steps))))


def validate():
    model.eval()
    total = 0.0
    with torch.no_grad(), torch.autocast('cuda', dtype=torch.bfloat16):
        for row in valid:
            ids, answer = encode(row)
            total += loss_of(ids, answer).item()
    model.train()
    return total / len(valid)


print('samples', len(train), 'updates', steps, 'valid at start', round(validate(), 4), flush=True)
start = time.time()
running = 0.0
model.train()
for i, row in enumerate(train, 1):
    ids, answer = encode(row)
    with torch.autocast('cuda', dtype=torch.bfloat16):
        loss = loss_of(ids, answer)
    (loss / ACCUM).backward()
    running += loss.item()
    if i % ACCUM == 0:
        torch.nn.utils.clip_grad_norm_(params, 1.0)
        optim.step()
        sched.step()
        optim.zero_grad(set_to_none=True)
    if i % 400 == 0:
        model.save_pretrained(out / 'lora-partial')
        print(f'{i}/{len(train)} loss {running / 400:.4f} valid {validate():.4f} {int(time.time() - start)} s, {torch.cuda.max_memory_allocated() // 2**30} GB', flush=True)
        running = 0.0
print('valid at the end', round(validate(), 4), flush=True)
model.save_pretrained(out / 'lora')
merged = model.merge_and_unload()
merged.save_pretrained(out / 'merged', max_shard_size='5GB')
tok.save_pretrained(out / 'merged')
print('saved', flush=True)
