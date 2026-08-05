# Devcontainer — GitHub credentials via SSH agent forwarding

This devcontainer authenticates to GitHub over SSH using a key that lives on the host. The private key is **never** copied into the container — only the host's `ssh-agent` socket is forwarded in.

## Before you start DevPod (each session)

Load your GitHub key into the host agent:

```sh
ssh-add ~/.ssh/id_ed25519
```

If `ssh-add` reports `Could not open a connection to your authentication agent`, start the agent first:

```sh
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Verify it loaded:

```sh
ssh-add -l   # should print the SHA256 fingerprint of id_ed25519
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
