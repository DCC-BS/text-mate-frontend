#!/usr/bin/env bash
# Syncs staged personal coding-agent state (see scripts/host-sync.sh) from the
# read-only /mnt/agent-state mount into the container home.
#
# Invoked from setup.sh, postStartCommand, and /etc/zsh/zshenv (every shell).
# The shell hook is the one that matters in practice: DevPod's dotfiles
# linking re-applies dot_omp/config.yml after each `up`, so the staged state
# must be re-applied after that — the next shell start does it.
set -euo pipefail

[ -d /mnt/agent-state ] || exit 0

# omp (oh-my-pi), staged by host-sync.sh — no-op when the staging dir is empty
if [ -d /mnt/agent-state/omp ]; then
    mkdir -p ~/.omp/agent
    for f in /mnt/agent-state/omp/*; do
        dst="$HOME/.omp/agent/$(basename "$f")"
        if [ -f "$f" ] && ! cmp -s "$f" "$dst" 2>/dev/null; then
            cp "$f" "$dst"
        fi
    done
fi
