#!/bin/bash
# The test's copy of the extension follows the branch; the simulator changed, heldout files did not.
cd /root/projects/hivey-finetune || exit 1
SRC=/root/projects/hivey-browser/.claude/worktrees/ui-aura-security/third_party/hivey-ai-sidebar
sha256sum -c frozen.sha256 2>&1 | grep -E "heldout" | cut -c1-40
rm -rf sidebar/src sidebar/bench sidebar/scripts
cp -r "$SRC/src" "$SRC/bench" "$SRC/scripts" sidebar/
sha256sum heldout.mjs heldout2.mjs sidebar/bench/browser.mjs sidebar/bench/checks.mjs > frozen.sha256
cut -c1-12,65- frozen.sha256
