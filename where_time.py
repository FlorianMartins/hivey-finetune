"""Where an agent task's time goes on a CPU: reading the prompt, writing, and how much of the prompt was already cached."""
import re
import statistics
import sys

for name in sys.argv[1:]:
    log = open(f'/root/projects/hivey-finetune/results/speed-{name}.server.log').read()
    prompt = [(float(a), int(b)) for a, b in re.findall(r'prompt eval time =\s+([\d.]+) ms /\s+(\d+) tokens', log)]
    gen = [(float(a), int(b)) for a, b in re.findall(r'\|\s+eval time =\s+([\d.]+) ms /\s+(\d+) tokens', log)]
    cached = [int(x) for x in re.findall(r'n_past = (\d+)', log)] or [int(x) for x in re.findall(r'cache_tokens[^\d]*(\d+)', log)]
    tot_p = sum(a for a, _ in prompt) / 1000
    tot_g = sum(a for a, _ in gen) / 1000
    print(f'== {name}: {len(prompt)} requests')
    print(f'  reading the prompt: {tot_p:.0f} s in all, {sum(b for _, b in prompt)} new tokens, median {statistics.median([b for _, b in prompt])} a request, {sum(b for _, b in prompt) / max(1, tot_p):.0f} tokens/s')
    print(f'  writing: {tot_g:.0f} s in all, {sum(b for _, b in gen)} tokens, median {statistics.median([b for _, b in gen]) if gen else 0} a request, {sum(b for _, b in gen) / max(1, tot_g):.1f} tokens/s')
    print('  share of the time spent reading:', f'{100 * tot_p / max(1e-9, tot_p + tot_g):.0f} %')
    hits = re.findall(r'(?:prompt cache|reusing|cache hit|similarity)[^\n]{0,100}', log)
    print('  cache lines seen:', len(hits), hits[:2])
