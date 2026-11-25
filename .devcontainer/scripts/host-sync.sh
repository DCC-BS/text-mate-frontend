#!/usr/bin/env bash
# Runs on the HOST before the container is created or started
# (initializeCommand in devcontainer.json).
#
# Stages personal coding-agent state into a per-user directory that is always
# mounted into the container read-only. Opt-in per user: add your agent below.
# Teammates without an entry simply get an empty staging dir and no state is
# shared.
#
#   omp (oh-my-pi):  ~/.omp/agent -> settings, model catalog, provider keys
#   claude code:     not staged by default — add a `claude` block here if you
#                    want your ~/.claude state in the container (copy only
#                    config files, not session/history dirs)
set -euo pipefail

STAGING="${HOME}/.cache/devcontainer-agent-state"
mkdir -p "$STAGING"

# omp (oh-my-pi)
if [ -d "$HOME/.omp/agent" ]; then
    mkdir -p "$STAGING/omp"
    for f in config.yml models.db models.db-wal models.db-shm agent.db agent.db-wal agent.db-shm; do
        [ -f "$HOME/.omp/agent/$f" ] && cp "$HOME/.omp/agent/$f" "$STAGING/omp/"
    done
fi
