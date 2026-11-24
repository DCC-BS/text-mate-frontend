#!/usr/bin/env bash
# Syncs the container's omp (oh-my-pi) agent state from the host.
# The host's ~/.omp/agent is mounted read-only at /mnt/host-omp-agent
# (see devcontainer.json). Copied: settings, model catalog and provider
# credentials. Logs, sessions and natives stay container-local.
#
# Invoked from setup.sh, postStartCommand, and /etc/zsh/zshenv (every shell).
# The shell hook is the one that matters in practice: DevPod's dotfiles
# linking re-applies dot_omp/config.yml after each `up`, so the host state
# must be re-applied after that — the next shell start does it.
set -euo pipefail

if [ ! -d /mnt/host-omp-agent ]; then
    exit 0
fi

# Runs on every shell start via /etc/zsh/zshenv — keep it cheap: only copy
# files whose content actually differs from the host version.
mkdir -p ~/.omp/agent
for f in config.yml models.db models.db-wal models.db-shm agent.db agent.db-wal agent.db-shm; do
    src="/mnt/host-omp-agent/$f"
    dst="$HOME/.omp/agent/$f"
    if [ -f "$src" ] && ! cmp -s "$src" "$dst" 2>/dev/null; then
        cp "$src" "$dst"
    fi
done
