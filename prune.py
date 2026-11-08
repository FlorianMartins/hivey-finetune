"""Keeps, in each layer, the experts our agent work chooses most; the rest goes, with their router rows.
    prune.py <keep fraction> <out dir>
The MTP head keeps the last layer's experts (it is left out of the GGUF anyway)."""
import json
import shutil
import sys
from pathlib import Path

import torch
from safetensors.torch import load_file, save_file

SRC = Path('base/Qwen3.6-35B-A3B')
keep, out = float(sys.argv[1]), Path(sys.argv[2])
stats = json.load(open('results/moe-stats.json'))
E = stats['experts']
n = int(E * keep)
kept = [sorted(torch.tensor(c).argsort(descending=True)[:n].tolist()) for c in stats['count']]
out.mkdir(parents=True, exist_ok=True)
for f in SRC.iterdir():
    if f.suffix != '.safetensors' and f.is_file():
        shutil.copy2(f, out / f.name)
cfg = json.load(open(SRC / 'config.json'))
cfg['text_config']['num_experts'] = n
json.dump(cfg, open(out / 'config.json', 'w'), indent=2)

index = json.load(open(SRC / 'model.safetensors.index.json'))
for shard in sorted(set(index['weight_map'].values())):
    tensors = load_file(SRC / shard)
    for name in list(tensors):
        parts = name.split('.')
        if '.mlp.experts.' not in name and not name.endswith('.mlp.gate.weight'):
            continue
        layer = int(parts[parts.index('layers') + 1])
        ids = torch.tensor(kept[-1] if name.startswith('mtp.') else kept[layer])
        tensors[name] = tensors[name].index_select(0, ids).contiguous()
    save_file(tensors, out / shard, metadata={'format': 'pt'})
    print(shard, flush=True)
total = sum(t.numel() for s in sorted(set(index['weight_map'].values())) for t in load_file(out / s).values() if True)
print(f'kept {n} of {E} experts a layer; {total / 1e9:.1f} B parameters in all')
