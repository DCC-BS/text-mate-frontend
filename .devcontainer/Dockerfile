# Dev container base: Ubuntu 24.04 + mise + zsh.
# The project tools themselves (bun, node, varlock, usage, pass-cli) are NOT
# baked in — they are installed at container create time with `mise install`
# (scripts/setup.sh), so tool versions live only in ../mise.toml.
#
# Ubuntu 24.04 (noble) because mise.toml's [bootstrap.packages] uses noble apt
# names (e.g. libasound2t64); Debian would not resolve them.
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# mise's node >= 26 links against libatomic, which the slim base does not ship.
RUN apt-get update \
    && apt-get -y install --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# mise system-wide so every user and every shell (interactive or not) finds it.
RUN curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh -

# zsh as login shell for root (the remoteUser). The base image ships
# oh-my-zsh at /root/.oh-my-zsh; its `mise` plugin runs
# `eval "$(mise activate zsh)"` for interactive shells.
RUN usermod -s /usr/bin/zsh root
COPY zshrc /root/.zshrc

# Non-interactive shells (`devpod ssh <ws> -- cmd`) never read .zshrc, so put
# mise on their PATH too and give them a usable HOME. The omp sync hook runs on
# every shell start: DevPod's dotfiles linking re-applies dot_omp/config.yml
# after each `up`, and the host copy in /mnt/host-omp-agent must win.
COPY scripts/sync-omp.sh /usr/local/bin/sync-omp
RUN printf 'export HOME="${HOME:-/root}"\nexport PATH="/usr/local/bin:/root/.local/share/mise/shims:$PATH"\n' > /etc/zsh/zshenv \
    && printf 'test -d /mnt/host-omp-agent && /usr/local/bin/sync-omp >/dev/null 2>&1 || true\n' >> /etc/zsh/zshenv
