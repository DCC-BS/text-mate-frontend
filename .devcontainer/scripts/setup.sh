#!/usr/bin/env bash
set -euo pipefail

# Set zsh as the default login shell for the vscode user
# (common-utils installs/configures zsh but does not change the default shell)
sudo chsh -s /usr/bin/zsh vscode

# Install mise
curl https://mise.run | sh

# mise installs to ~/.local/bin which is not on PATH in non-interactive shells
export PATH="$HOME/.local/bin:$PATH"

# Trust the project's mise.toml in the current workspace directory
mise trust

# Install all tools from mise.toml (node, bun, varlock, pass-cli, usage, devpod).
# The postinstall hook (mise.toml:13) automatically runs: bun install + bunx nuxi prepare
mise install

# Activate mise in interactive shells
echo 'eval "$(mise activate zsh)"' >> "${ZDOTDIR-$HOME}/.zshrc"
