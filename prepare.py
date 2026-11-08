"""Conversations to training samples: for each answer of the model, exactly the prompt inference would
send, and that answer. Rendered by the model's own chat template, without thinking, like the browser."""
import json
import re
import random
import sys
from pathlib import Path

from transformers import AutoTokenizer

BASE = 'base/Qwen3.5-4B'
tok = AutoTokenizer.from_pretrained(BASE)


def clean(messages):
    out = []
    for m in messages:
        m = {k: v for k, v in m.items() if v is not None}
        if m.get('tool_calls'):
            m['tool_calls'] = [{'type': 'function', 'id': c.get('id'), 'function': {'name': c['function']['name'], 'arguments': json.loads(c['function']['arguments'] or '{}')}} for c in m['tool_calls']]
            m.setdefault('content', '')
        out.append(m)
    return out


def samples(row):
    messages = clean(row['messages'])
    for i, m in enumerate(messages):
        if m['role'] != 'assistant':
            continue
        prompt = tok.apply_chat_template(messages[:i], tools=row['tools'], tokenize=False, add_generation_prompt=True, enable_thinking=False)
        whole = tok.apply_chat_template(messages[:i + 1], tools=row['tools'], tokenize=False, enable_thinking=False)
        if not whole.startswith(prompt):
            raise ValueError('the answer does not follow its prompt:\n' + prompt[-200:] + '\n---\n' + whole[len(prompt) - 200:len(prompt) + 100])
        yield {'family': row.get('family') or row['id'].rsplit('-', 1)[0], 'prompt': prompt, 'completion': whole[len(prompt):]}


def main():
    rows = [json.loads(line) for line in open(sys.argv[1])]
    random.seed(7)
    random.shuffle(rows)
    held = max(20, len(rows) // 40)
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    counts = {}
    # A reply holding a stray think tag is rendered apart from its prompt: such a conversation goes, whole.
    leaked = lambda row: any(m.get('role') == 'assistant' and re.search(r'</?think>', str(m.get('content') or '')) for m in row['messages'])
    for name, part in (('valid', rows[:held]), ('train', rows[held:])):
        n = skipped = 0
        with open(out / f'{name}.jsonl', 'w') as f:
            for row in part:
                if leaked(row):
                    skipped += 1
                    continue
                try:
                    got = list(samples(row))
                except ValueError:
                    skipped += 1
                    continue
                for s in got:
                    f.write(json.dumps(s) + '\n')
                    n += 1
                    counts[s['family']] = counts.get(s['family'], 0) + 1
        print(name, len(part), 'conversations,', n, 'samples,', skipped, 'skipped')
    print(counts)
    s = next(samples(rows[0]))
    print('tokens of a prompt:', len(tok(s['prompt'])['input_ids']))
    print('END OF PROMPT >>>', repr(s['prompt'][-160:]))
    print('COMPLETION >>>', repr(s['completion'][:300]))


main()
