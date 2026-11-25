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

# 5. Personal coding-agent state. The sync script is baked into the shared
#    devcontainer image (/usr/local/bin/sync-agent); postStartCommand re-runs
#    it on every start (DevPod's dotfiles step re-links dot_omp after
#    postCreate, so the staged copy must be re-applied).
bash /usr/local/bin/sync-agent
