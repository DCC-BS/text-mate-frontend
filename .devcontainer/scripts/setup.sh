#!/usr/bin/env bash
# Runs once when the dev container is created (postCreateCommand in
# devcontainer.json). Installs the complete toolchain from the project's
# mise.toml.
set -euo pipefail

# Work from the workspace root regardless of the caller's cwd.
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

# 1. mise refuses to evaluate an untrusted config in a fresh container.
mise trust

# 2. Install every tool pinned in mise.toml (bun, node, varlock, usage,
#    pass-cli). The postinstall hook (mise.toml) then runs the `install` task:
#    `bun install` plus the Playwright Chromium download.
mise install

# 3. OS libraries required to launch the Playwright browser, declared in
#    [bootstrap.packages] (Ubuntu noble apt names). Runs apt-get as root.
mise bootstrap packages apply --update --yes

# 4. Pin GitHub's host key so the first `git fetch`/`git push` inside the
#    container is non-interactive. Authentication itself goes through the
#    forwarded host ssh-agent; no private key is ever stored here.
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts

# 5. Seed the container's omp (oh-my-pi) agent state from the host: settings,
#    model catalog and provider credentials. The host dir is mounted read-only
#    at /mnt/host-omp-agent (see devcontainer.json); logs, sessions and natives
#    stay container-local. Plain copies (not sqlite backup) so this works
#    against the read-only mount; sqlite replays the -wal on first open.
if [ -d /mnt/host-omp-agent ]; then
    mkdir -p ~/.omp/agent
    for f in config.yml models.db models.db-wal models.db-shm agent.db agent.db-wal agent.db-shm; do
        [ -f "/mnt/host-omp-agent/$f" ] && cp "/mnt/host-omp-agent/$f" ~/.omp/agent/
    done
fi
