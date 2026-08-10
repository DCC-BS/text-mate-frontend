# Devcontainer — GitHub credentials via SSH agent forwarding

This devcontainer authenticates to GitHub over SSH using a key that lives on the host. The private key is **never** copied into the container — only the host's `ssh-agent` socket is forwarded in.

## File ownership: why the remote user is `root`

This host runs Docker in **rootless** mode, which remaps uids via the user namespace. With the default subuid range (`100000:65536`), the container's `vscode` user (uid `1000` inside) appears as host uid **`100999`** — not as your host user. Any file written from inside the container (e.g. a `git checkout`) would therefore be owned by `100999` on the host, breaking git with permission errors.

Under rootless Docker the only container uid that maps to the host user (`tobi`, uid `1000`) is **uid `0`** (root). So `devcontainer.json` sets:

- `remoteUser: "root"` and `containerUser: "root"` — the dev session runs as in-container root, so writes land as host `tobi`.
- `updateRemoteUserUID: false` — the automatic uid-rewrite is disabled because it can't produce a usable uid under remapping.
- `HOME=/home/vscode` (in `containerEnv`/`remoteEnv`) — reuses the `vscode` home that the `common-utils` feature and `setup.sh` configure (mise, zsh, the bind-mounted `.gitconfig`), so tooling is unaffected.

This is safe: rootless Docker already confines in-container root to your unprivileged host user, so there is no privilege escalation beyond `tobi`.

If you ever see files owned by `100999` again (e.g. after restoring a backup), reclaim them on the host:

```sh
sudo chown -R tobi:tobi /home/tobi/Code/text-mate-frontend
```

## One-time host setup (per machine)

This devcontainer forwards the host's SSH agent into the container — the private key is **never** copied in. Configure the host once and you never need to think about it again; no per-session `ssh-agent` / `ssh-add` dance.

### 1. Use the persistent systemd agent

Modern systemd already runs `ssh-agent.socket` at boot and exposes it at `$XDG_RUNTIME_DIR/openssh_agent`. Point your shell at it instead of spawning a throwaway agent per terminal:

```sh
mkdir -p ~/.config/environment.d
echo 'SSH_AUTH_SOCK=${XDG_RUNTIME_DIR}/openssh_agent' > ~/.config/environment.d/ssh-agent.conf
```

Log out and back in (or reboot) for it to take effect. Verify with:

```sh
echo "$SSH_AUTH_SOCK"   # should print /run/user/<uid>/openssh_agent
```

On hosts without systemd user units (e.g. WSL, macOS), fall back to the per-shell agent:

```sh
# only if the systemd socket is unavailable
eval "$(ssh-agent -s)"
```

### 2. Auto-load the key on first use

Add this line **above any `Host` block** in `~/.ssh/config`:

```
AddKeysToAgent yes
```

Now the first `git pull` / `ssh git@github.com` silently loads `~/.ssh/id_ed25519` into the agent. For a passphrase-less key this is completely invisible; for a passphrase-protected key you are prompted once per agent lifetime (consider removing the passphrase with `ssh-keygen -p -f ~/.ssh/id_ed25519`, or wire up `SSH_ASKPASS` / KWallet for auto-unlock).

### 3. Verify

```sh
ssh -T git@github.com   # should greet you as your GitHub user
ssh-add -l              # should list the SHA256 of id_ed25519 after first use
```

## How it works

1. `.devcontainer.json` forwards `SSH_AUTH_SOCK` into the container via `remoteEnv`.
2. DevPod's SSH config (`ForwardAgent yes`) bridges the host agent socket into the container host.
3. `setup.sh` writes git identity + trusted github.com host key inside the container so the first `git push` / `git pull` is non-interactive.

Remotes must use the SSH form:

```
git@github.com:org/repo.git
```

HTTPS remotes will **not** work this way (they'd need Git Credential Manager, which is not configured here).

## After the container is up — verify

Run these inside the container:

```sh
ssh-add -l              # should list the SHA256 of id_ed25519
ssh -T git@github.com   # should greet you as your GitHub user
git ls-remote           # should list refs without prompting
```

## Troubleshooting

- **`ssh-add -l` says "Could not open a connection"** — the agent socket isn't being forwarded (DevPod-specific wrinkle). Stop DevPod, re-run `ssh-add ~/.ssh/id_ed25519` on the host, and restart. If it still fails, fall back to bind-mounting `~/.ssh`.
- **`Permission denied (publickey)`** — the host agent has no key loaded. Run `ssh-add -l` on the host to confirm.
- **Wrong GitHub identity** — this setup forwards only the default key (`id_ed25519`). Repos on the `github.com-bs` work account are not accessible from the container. Clone them on the host instead, or extend `setup.sh` to mirror the conditional `Host github.com-bs` block from `~/.ssh/config`.
