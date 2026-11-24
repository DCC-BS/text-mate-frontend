#!/usr/bin/env bash
# Syncs the container's omp (oh-my-pi) agent state from the host.
# The host's ~/.omp/agent is mounted read-only at /mnt/host-omp-agent
# (see devcontainer.json). Copied here: settings, model catalog and provider
# credentials. Logs, sessions and natives stay container-local.
#
# Called from setup.sh (postCreateCommand) and postStartCommand. The second
# call matters: DevPod's dotfiles step runs after postCreate and re-links
# dot_omp/config.yml over the host copy, so every start re-applies the host
# state as the source of truth.
set -euo pipefail

if [ ! -d /mnt/host-omp-agent ]; then
    exit 0
fi

mkdir -p ~/.omp/agent
for f in config.yml models.db models.db-wal models.db-shm agent.db agent.db-wal agent.db-shm; do
    [ -f "/mnt/host-omp-agent/$f" ] && cp "/mnt/host-omp-agent/$f" ~/.omp/agent/
done
