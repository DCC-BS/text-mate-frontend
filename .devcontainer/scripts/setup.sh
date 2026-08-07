#!/usr/bin/env bash
set -euo pipefail

# Set zsh as the default login shell.
# Root is set because the remote user is root (see devcontainer.json); vscode is
# kept for compatibility with the common-utils feature that configures it.
chsh -s /usr/bin/zsh root
chsh -s /usr/bin/zsh vscode

# Install mise
curl https://mise.run | sh

# mise installs to ~/.local/bin which is not on PATH in non-interactive shells
export PATH="$HOME/.local/bin:$PATH"

# Trust the project's mise.toml in the current workspace directory
mise trust

# Install all tools from mise.toml (node, bun, varlock, pass-cli, usage, devpod).
# The postinstall hook (mise.toml:13) automatically runs: bun install + bunx nuxi prepare
mise install

# Enable oh-my-zsh's bundled mise plugin.
# The plugin runs `eval "$(mise activate zsh)"` itself and generates the
# `_mise` completion function, so we no longer activate mise manually here.
# Idempotent: only edits the plugins line if `mise` isn't already listed.
ZSHRC="${ZDOTDIR-$HOME}/.zshrc"
if ! grep -qE '^plugins=\([^)]*\bmise\b' "$ZSHRC"; then
    sed -i -E 's/^plugins=\(([^)]*)\)/plugins=(\1 mise)/' "$ZSHRC"
fi

# Arrow-navigable completion menu (fish-style popup on Tab).
# The mise plugin registers completion functions but does not set menu styling.
# Idempotent: guarded so container rebuilds don't duplicate the block.
if ! grep -q "completion menu block" "$ZSHRC"; then
    cat >> "$ZSHRC" <<'EOF'

# >>> completion menu block >>>
zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'
# <<< completion menu block <<<
EOF
fi
